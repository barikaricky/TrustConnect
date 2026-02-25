import { Request, Response } from 'express';

/**
 * Verification Controller
 * Handles NIN/BVN identity verification and selfie uploads
 * for artisan registration flow.
 *
 * Strategy:
 *  1. Try real VerifyMe API (NIN/BVN lookup) → returns real name
 *  2. If the API fails or key is missing → return manualEntry:true
 *     so the mobile app lets the user type their name manually
 */

const VERIFYME_API_KEY = process.env.VERIFYME_API_KEY || '';
const VERIFYME_BASE = 'https://vapi.verifyme.ng/v1/verifications/identities';

export class VerificationController {
  /* ──────────────────────────────────────────────────
   * POST /api/verification/verify-id
   * Body: { idType: 'NIN'|'BVN', idNumber: string }
   * Returns:
   *   • success + legalName  (real API hit)
   *   • success + manualEntry:true (API unavailable → user enters name)
   * ────────────────────────────────────────────────── */
  static async verifyID(req: Request, res: Response) {
    try {
      const { idType, idNumber } = req.body;

      if (!idType || !idNumber) {
        return res.status(400).json({
          success: false,
          message: 'idType and idNumber are required',
        });
      }

      const validTypes = ['NIN', 'BVN', 'nin', 'bvn'];
      if (!validTypes.includes(idType)) {
        return res.status(400).json({
          success: false,
          message: 'idType must be NIN or BVN',
        });
      }

      // Format validation
      const cleanNumber = idNumber.replace(/\s/g, '');
      if (!/^\d+$/.test(cleanNumber)) {
        return res.status(400).json({
          success: false,
          message: `${idType.toUpperCase()} must contain only digits`,
        });
      }

      if (cleanNumber.length < 10 || cleanNumber.length > 11) {
        return res.status(400).json({
          success: false,
          message: `${idType.toUpperCase()} must be 10-11 digits`,
        });
      }

      /* ── 1. Try real VerifyMe API ─────────────────────── */
      if (VERIFYME_API_KEY) {
        try {
          const endpoint =
            idType.toUpperCase() === 'NIN'
              ? `${VERIFYME_BASE}/nin/${cleanNumber}`
              : `${VERIFYME_BASE}/bvn/${cleanNumber}`;

          const apiRes = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${VERIFYME_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          if (apiRes.ok) {
            const data: any = await apiRes.json();
            // VerifyMe returns { data: { firstname, lastname, middlename, ... } }
            const d = data.data || data;
            const firstName = (d.firstname || d.firstName || '').trim();
            const lastName = (d.lastname || d.lastName || '').trim();
            const middleName = (d.middlename || d.middleName || '').trim();

            const legalName = [firstName, middleName, lastName]
              .filter(Boolean)
              .join(' ')
              .toUpperCase();

            if (legalName) {
              console.log(`✅ [LIVE] Verified ${idType.toUpperCase()}: ${cleanNumber.substring(0, 4)}**** → ${legalName}`);
              return res.json({
                success: true,
                legalName,
                idType: idType.toUpperCase(),
                idNumber: cleanNumber,
                verificationSource: 'verifyme',
                manualEntry: false,
                message: `${idType.toUpperCase()} verified successfully`,
              });
            }
          }

          // Non-200 → fall through to manual entry
          console.warn(`⚠️ VerifyMe returned ${apiRes.status} for ${idType} — falling back to manual entry`);
        } catch (apiErr) {
          console.error('VerifyMe API error:', apiErr);
        }
      }

      /* ── 2. Fallback: Let the user enter their name manually ── */
      console.log(`🔄 [MANUAL] API unavailable for ${idType.toUpperCase()}: ${cleanNumber.substring(0, 4)}**** → manual entry`);

      return res.json({
        success: true,
        legalName: '',
        idType: idType.toUpperCase(),
        idNumber: cleanNumber,
        verificationSource: 'manual',
        manualEntry: true,
        message: `Auto-verification unavailable. Please enter your full legal name as it appears on your ${idType.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('ID verification error:', error);
      res.status(500).json({
        success: false,
        message: 'ID verification failed',
      });
    }
  }

  /* ──────────────────────────────────────────────────
   * POST /api/verification/upload-selfie
   * Handles selfie photo upload for identity verification.
   * Expects multipart file field: "selfie"
   * ────────────────────────────────────────────────── */
  static async uploadSelfie(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No selfie file uploaded. Use field name "selfie".',
        });
      }

      const fileUrl = `/uploads/selfies/${req.file.filename}`;

      console.log(`📸 Selfie uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(1)}KB)`);

      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        message: 'Selfie uploaded successfully',
      });
    } catch (error) {
      console.error('Selfie upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload selfie',
      });
    }
  }
}
