import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, settings: settingsMap, raw: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list settings' });
  }
};

export const updateSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    const { value, category, description } = req.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: String(value),
        category: category ? String(category) : undefined,
        description: description ? String(description) : undefined,
      },
      create: {
        key: String(key),
        value: String(value),
        category: category ? String(category) : 'GENERAL',
        description: description ? String(description) : null,
      },
    });

    await logActivity({
      req,
      action: 'UPDATE_SETTING',
      module: 'SETTINGS',
      description: `Updated setting "${key}"`,
      metadata: { key, value },
    });

    res.json({ success: true, message: `Setting ${key} updated`, setting });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update setting' });
  }
};

export const bulkUpdateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, message: 'Settings object required' });
      return;
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), category: 'GENERAL' },
      });
    }

    await logActivity({
      req,
      action: 'BULK_UPDATE_SETTINGS',
      module: 'SETTINGS',
      description: `Bulk updated system settings`,
      metadata: { updatedKeys: Object.keys(settings) },
    });

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update settings' });
  }
};

export const sendTestEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const targetEmail = email && typeof email === 'string' && email.includes('@') ? email.trim() : undefined;
    const { sendDirectTestEmail } = await import('../utils/notificationService.js');
    const result = await sendDirectTestEmail(targetEmail);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        previewUrl: result.previewUrl,
        providerName: result.providerName,
        isRealDelivery: result.isRealDelivery,
      });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch test email' });
  }
};
