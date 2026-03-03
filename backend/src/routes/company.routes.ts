import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All company routes are protected
router.post('/register', authMiddleware, CompanyController.registerCompany);
router.get('/profile', authMiddleware, CompanyController.getProfile);
router.put('/profile', authMiddleware, CompanyController.updateProfile);
router.get('/dashboard', authMiddleware, CompanyController.getDashboard);

export default router;
