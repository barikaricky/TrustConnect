import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All company routes are protected
router.post('/register', authMiddleware, CompanyController.registerCompany);
router.get('/profile', authMiddleware, CompanyController.getProfile);
router.put('/profile', authMiddleware, CompanyController.updateProfile);
router.get('/dashboard', authMiddleware, CompanyController.getDashboard);

// Workers who have worked with this company
router.get('/hired-workers', authMiddleware, CompanyController.getHiredWorkers);

// Pending quotes that company needs to act on
router.get('/pending-quotes', authMiddleware, CompanyController.getPendingQuotes);

// Company logo
router.post('/logo', authMiddleware, CompanyController.updateLogo);

// Job posting
router.post('/jobs', authMiddleware, CompanyController.postJob);
router.get('/jobs', authMiddleware, CompanyController.getPostedJobs);
router.get('/jobs/browse', CompanyController.browseJobs);   // artisans browse — no auth required
router.post('/jobs/:jobId/apply', authMiddleware, CompanyController.applyForJob);
router.put('/jobs/:jobId/application/:artisanUserId', authMiddleware, CompanyController.respondToApplication);

export default router;
