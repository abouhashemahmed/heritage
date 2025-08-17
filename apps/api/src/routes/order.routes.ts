// apps/api/src/routes/order.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '@/utils/database';
import logger from '@/utils/logger';
import {
  authenticate,
  validateRequest,
  rateLimitMiddleware,
  checkPermissions
} from '@/middlewares';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { calculateOrderTotal } from '@/utils/order';
import { env } from '@/config';

const router = Router();

/* ----------------------------- Custom Errors ----------------------------- */
class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = 'InsufficientStockError';
  }
}

class InvalidStatusTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = 'InvalidStatusTransitionError';
  }
}

class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order not found: ${id}`);
    this.name = 'OrderNotFoundError';
  }
}

/* --------------------------- Zod Schemas --------------------------- */
const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive()
});

const AddressSchema = z.object({
  street: z.string().min(3),
  city: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().min(3)
});

const OrderCreateSchema = z.object({
  items: z.array(OrderItemSchema),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  paymentMethod: z.enum([
    'CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'
  ] as [PaymentMethod, ...PaymentMethod[]]),
  customerNote: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid().optional()
});

const OrderUpdateSchema = z.object({
  status: z.enum([
    'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
  ] as [OrderStatus, ...OrderStatus[]]),
  trackingNumber: z.string().optional()
});

const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(5).max(50).default(20),
  status: z.enum([
    'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
  ] as [OrderStatus, ...OrderStatus[]]).optional()
});

const OrderIdSchema = z.object({
  id: z.string().uuid()
});

/* --------------------- Valid Status Transitions --------------------- */
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
};

/* ------------------------------- Routes ------------------------------- */

// Create Order
router.post(
  '/',
  authenticate(),
  rateLimitMiddleware('checkout'), // Stricter: 10 req/min
  validateRequest({ body: OrderCreateSchema }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        items, 
        shippingAddress, 
        billingAddress, 
        paymentMethod, 
        customerNote,
        idempotencyKey
      } = req.body;

      // Idempotency check
      if (idempotencyKey) {
        const existingOrder = await prisma.order.findFirst({
          where: { idempotencyKey }
        });
        if (existingOrder) {
          return res.status(409).json(existingOrder);
        }
      }

      // Calculate order total and verify stock
      const { total, itemsWithDetails } = await calculateOrderTotal(items);

      // Create order transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            userId,
            total,
            status: 'PENDING',
            paymentMethod,
            customerNote,
            idempotencyKey,
            shippingAddress: { create: shippingAddress },
            billingAddress: { create: billingAddress || shippingAddress },
            items: {
              create: itemsWithDetails.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
              }))
            }
          },
          include: { items: true }
        });

        // Batch inventory updates with stock validation
        const updateResults = await Promise.all(
          items.map(item => 
            tx.product.updateMany({
              where: { 
                id: item.productId,
                stock: { gte: item.quantity } // Only update if sufficient stock
              },
              data: { stock: { decrement: item.quantity } }
            })
          )
        );

        // Verify all updates succeeded
        updateResults.forEach((result, index) => {
          if (result.count === 0) {
            throw new InsufficientStockError(items[index].productId);
          }
        });

        // Create initial order event
        await tx.orderEvent.create({
          data: {
            orderId: newOrder.id,
            type: 'CREATED',
            userId,
            payload: {
              status: 'PENDING',
              total
            }
          }
        });

        return newOrder;
      });

      // Fraud check (only in production when enabled)
      if (env.NODE_ENV === 'production' && env.FRAUD_CHECK_ENABLED === 'true') {
        const fraudRisk = await performFraudCheck(order);
        if (fraudRisk > parseFloat(env.FRAUD_RISK_THRESHOLD || '0.8')) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PENDING_REVIEW' }
          });
          await prisma.orderEvent.create({
            data: {
              orderId: order.id,
              type: 'FRAUD_FLAGGED',
              userId: 'system',
              payload: { riskScore: fraudRisk }
            }
          });
          logger.warn(`Order ${order.id} flagged for fraud review`);
        }
      }

      logger.info(`Order created: ${order.id} for user ${userId}`);
      res.status(201).json(order);

    } catch (error) {
      logger.error(error, 'Order creation failed');
      
      if (error instanceof InsufficientStockError) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Order creation failed' });
    }
  }
);

// Get User Orders
router.get(
  '/user',
  authenticate(),
  validateRequest({ query: OrderQuerySchema }),
  async (req, res) => {
    try {
      const { page, limit, status } = req.query;
      const userId = req.user.id;

      const whereClause = {
        userId,
        ...(status && { status })
      };

      const [orders, totalOrders] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { product: { select: { name: true, images: true } } }
            },
            shippingAddress: true
          }
        }),
        prisma.order.count({ where: whereClause })
      ]);

      res.json({
        data: orders,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / Number(limit))
        }
      });

    } catch (error) {
      logger.error(error, 'Order history fetch failed');
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// Get Admin Orders
router.get(
  '/admin',
  authenticate(),
  checkPermissions('admin'),
  validateRequest({ query: OrderQuerySchema }),
  async (req, res) => {
    try {
      const { page, limit, status } = req.query;

      const whereClause = status ? { status } : undefined;

      const [orders, totalOrders] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: true,
            shippingAddress: true
          }
        }),
        prisma.order.count({ where: whereClause })
      ]);

      res.json({
        data: orders,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / Number(limit))
        }
      });

    } catch (error) {
      logger.error(error, 'Admin order fetch failed');
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// Get Order by ID
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: OrderIdSchema }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          shippingAddress: true,
          billingAddress: true,
          user: isAdmin ? { select: { id: true, name: true } } : undefined,
          events: { 
            take: 10, 
            orderBy: { createdAt: 'desc' } 
          }
        }
      });

      if (!order) {
        throw new OrderNotFoundError(id);
      }
      
      if (order.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(order);

    } catch (error) {
      logger.error(error, 'Order details fetch failed');
      
      if (error instanceof OrderNotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  }
);

// Update Order Status
router.patch(
  '/:id/status',
  authenticate(),
  checkPermissions('admin', 'order_manager'),
  validateRequest({ 
    params: OrderIdSchema,
    body: OrderUpdateSchema
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, trackingNumber } = req.body;
      const userId = req.user.id;

      const currentOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true } // Needed for stock reversion
      });

      if (!currentOrder) {
        throw new OrderNotFoundError(id);
      }

      // Validate status transition
      if (!VALID_STATUS_TRANSITIONS[currentOrder.status].includes(status)) {
        throw new InvalidStatusTransitionError(currentOrder.status, status);
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Revert stock if cancelling a non-completed order
        if (status === 'CANCELLED' && 
            ['PENDING', 'PROCESSING'].includes(currentOrder.status)) {
          await Promise.all(
            currentOrder.items.map(item => 
              tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
              })
            )
          );
        }

        // Update order status
        const order = await tx.order.update({
          where: { id },
          data: {
            status,
            ...(trackingNumber && { trackingNumber })
          }
        });

        // Create audit event
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: 'STATUS_CHANGE',
            userId,
            payload: {
              from: currentOrder.status,
              to: status,
              ...(trackingNumber && { trackingNumber })
            }
          }
        });

        return order;
      });

      // Integrate with shipping provider
      if (status === 'SHIPPED' && trackingNumber) {
        await notifyShippingProvider(id, trackingNumber);
      }

      logger.info(`Order ${id} status updated to ${status} by user ${userId}`);
      res.json(updatedOrder);

    } catch (error) {
      logger.error(error, 'Order status update failed');
      
      if (error instanceof OrderNotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error instanceof InvalidStatusTransitionError) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
);

/* --------------------------- Helper Functions --------------------------- */

/**
 * Perform fraud check with external service
 */
async function performFraudCheck(order: any): Promise<number> {
  try {
    const response = await fetch(env.FRAUD_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.FRAUD_API_KEY}`
      },
      body: JSON.stringify({
        orderId: order.id,
        userId: order.userId,
        total: order.total,
        itemsCount: order.items.length,
        ipAddress: order.metadata?.ipAddress
      })
    });

    if (!response.ok) {
      throw new Error(`Fraud service responded with ${response.status}`);
    }

    const data = await response.json();
    return data.riskScore;
  } catch (error) {
    logger.error(error, 'Fraud check failed');
    return 0; // Fail open
  }
}

/**
 * Notify shipping provider about shipment
 */
async function notifyShippingProvider(orderId: string, trackingNumber: string) {
  try {
    await fetch(env.SHIPPING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shipping-API-Key': env.SHIPPING_API_KEY
      },
      body: JSON.stringify({
        orderId,
        trackingNumber,
        carrier: env.SHIPPING_CARRIER || 'dhl'
      })
    });
    logger.info(`Shipping notification sent for order ${orderId}`);
  } catch (error) {
    logger.error(error, 'Shipping notification failed');
  }
}

export default router;