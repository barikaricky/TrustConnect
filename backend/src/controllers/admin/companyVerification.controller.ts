import { Request, Response } from 'express';
import { collections } from '../../database/connection';

export class AdminCompanyVerificationController {
  /**
   * GET /api/admin/companies
   * List all company profiles with optional status filter
   */
  static async listCompanies(req: Request, res: Response) {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {};
      if (status) filter.verificationStatus = status;

      const [companies, total] = await Promise.all([
        collections.companyProfiles().find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limitNum).toArray(),
        collections.companyProfiles().countDocuments(filter),
      ]);

      // Enrich with user info
      const enriched = await Promise.all(
        companies.map(async (cp) => {
          const user = await collections.users().findOne({ id: cp.userId }, { projection: { name: 1, phone: 1, email: 1 } });
          return { ...cp, userName: user?.name, userPhone: user?.phone, userEmail: user?.email };
        })
      );

      res.json({
        success: true,
        data: enriched,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      console.error('List companies error:', error);
      res.status(500).json({ success: false, message: 'Failed to list companies' });
    }
  }

  /**
   * GET /api/admin/companies/:id
   * Get single company profile details
   */
  static async getCompany(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

      const cp = await collections.companyProfiles().findOne({ id });
      if (!cp) return res.status(404).json({ success: false, message: 'Company not found' });

      const user = await collections.users().findOne({ id: cp.userId }, { projection: { name: 1, phone: 1, email: 1 } });

      res.json({ success: true, data: { ...cp, userName: user?.name, userPhone: user?.phone, userEmail: user?.email } });
    } catch (error) {
      console.error('Get company error:', error);
      res.status(500).json({ success: false, message: 'Failed to get company' });
    }
  }

  /**
   * PATCH /api/admin/companies/:id/verify
   * Approve or reject a company
   * Body: { action: 'approve' | 'reject' | 'suspend', notes?: string }
   */
  static async verifyCompany(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

      const { action, notes } = req.body;
      if (!action || !['approve', 'reject', 'suspend'].includes(action)) {
        return res.status(400).json({ success: false, message: 'action must be approve, reject, or suspend' });
      }

      const statusMap: Record<string, string> = {
        approve: 'verified',
        reject: 'rejected',
        suspend: 'suspended',
      };

      const update: any = {
        verificationStatus: statusMap[action],
        updatedAt: new Date().toISOString(),
      };
      if (notes) update.adminNotes = notes;
      if (action === 'approve') update.verifiedAt = new Date().toISOString();

      const result = await collections.companyProfiles().findOneAndUpdate(
        { id },
        { $set: update },
        { returnDocument: 'after' }
      );

      if (!result) return res.status(404).json({ success: false, message: 'Company not found' });

      res.json({
        success: true,
        message: `Company ${statusMap[action]} successfully`,
        data: result,
      });
    } catch (error) {
      console.error('Verify company error:', error);
      res.status(500).json({ success: false, message: 'Failed to update company verification' });
    }
  }
}
