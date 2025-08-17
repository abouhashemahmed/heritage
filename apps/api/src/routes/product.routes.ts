// apps/api/src/routes/product.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '@/utils/database';
import logger from '@/utils/logger';
import { 
  validateRequest,
  authenticate,
  rateLimitMiddleware 
} from '@/middlewares';

const router = Router();

// ✅ Zod schemas for request validation
const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(10).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional()
});

const ProductCreateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  categoryIds: z.array(z.string().uuid()).optional()
});

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get paginated products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 10, maximum: 100, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product list
 */
router.get(
  '/',
  rateLimitMiddleware('public'),
  validateRequest({ query: ProductQuerySchema }),
  async (req, res) => {
    try {
      const { page, limit, category, search } = req.query;

      const products = await prisma.product.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        where: {
          ...(category && { categories: { some: { slug: String(category) } } }),
          ...(search && { name: { contains: String(search), mode: 'insensitive' } })
        },
        include: {
          categories: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' } // ✅ Consistent ordering
      });

      res.json({
        data: products,
        meta: {
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      logger.error(error, 'Product list error');
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { 
        categories: true,
        reviews: { take: 5 }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error(error, 'Product fetch error');
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create new product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201:
 *         description: Created product
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate('admin'),
  rateLimitMiddleware('strict'),
  validateRequest({ body: ProductCreateSchema }),
  async (req, res) => {
    try {
      const product = await prisma.product.create({
        data: {
          ...req.body,
          categories: req.body.categoryIds 
            ? { connect: req.body.categoryIds.map(id => ({ id })) } 
            : undefined
        },
        include: { categories: true }
      });

      res.status(201).json(product);
    } catch (error) {
      logger.error(error, 'Product creation failed');
      res.status(400).json({ error: 'Invalid product data' });
    }
  }
);

export default router;
