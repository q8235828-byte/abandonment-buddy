import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCampaignDto } from './dto/save-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getCampaign(storeId: string) {
    return this.prisma.campaign.findFirst({
      where: {
        storeId,
      },
    });
  }

  async saveCampaign(
    storeId: string,
    data: SaveCampaignDto,
  ) {
    const store =
      await this.prisma.store.findUnique({
        where: {
          id: storeId,
        },
      });

    if (!store) {
      throw new NotFoundException(
        'Store not found',
      );
    }

    const campaignData =
      this.buildCampaignData(data);

    const existing =
      await this.prisma.campaign.findFirst({
        where: {
          storeId,
        },
      });

    if (existing) {
      return this.prisma.campaign.update({
        where: {
          id: existing.id,
        },
        data: campaignData,
      });
    }

    return this.prisma.campaign.create({
      data: {
        storeId,
        ...campaignData,
      },
    });
  }

  private buildCampaignData(
    data: SaveCampaignDto,
  ) {
    return {
      ...(data.emailEnabled !== undefined
        ? {
            emailEnabled:
              data.emailEnabled,
          }
        : {}),

      ...(data.whatsappEnabled !== undefined
        ? {
            whatsappEnabled:
              data.whatsappEnabled,
          }
        : {}),

      ...(data.smsEnabled !== undefined
        ? {
            smsEnabled:
              data.smsEnabled,
          }
        : {}),

      ...(data.emailDelayMin !== undefined
        ? {
            emailDelayMin:
              data.emailDelayMin,
          }
        : {}),

      ...(data.whatsappDelayMin !== undefined
        ? {
            whatsappDelayMin:
              data.whatsappDelayMin,
          }
        : {}),

      ...(data.smsDelayMin !== undefined
        ? {
            smsDelayMin:
              data.smsDelayMin,
          }
        : {}),

      ...(data.emailTemplate !== undefined
        ? {
            emailTemplate:
              data.emailTemplate,
          }
        : {}),

      ...(data.whatsappTemplate !== undefined
        ? {
            whatsappTemplate:
              data.whatsappTemplate,
          }
        : {}),

      ...(data.smsTemplate !== undefined
        ? {
            smsTemplate:
              data.smsTemplate,
          }
        : {}),
    };
  }
}
