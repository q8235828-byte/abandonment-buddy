import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCampaignDto } from './dto/save-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async getCampaign(storeId: string) {
    return this.prisma.campaign.findFirst({ where: { storeId } });
  }

  async saveCampaign(storeId: string, data: SaveCampaignDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    const fields: Record<string, any> = {};
    const assign = (key: string, val: any) => { if (val !== undefined) fields[key] = val; };

    assign('emailEnabled',      data.emailEnabled);
    assign('whatsappEnabled',   data.whatsappEnabled);
    assign('smsEnabled',        data.smsEnabled);
    assign('emailDelayMin',     data.emailDelayMin);
    assign('whatsappDelayMin',  data.whatsappDelayMin);
    assign('smsDelayMin',       data.smsDelayMin);
    assign('templateId',         data.templateId);
    assign('emailTemplate',     data.emailTemplate);
    assign('whatsappTemplate',  data.whatsappTemplate);
    assign('smsTemplate',       data.smsTemplate);
    assign('emailStep2DelayMin',  data.emailStep2DelayMin);
    assign('emailStep2Subject',   data.emailStep2Subject);
    assign('emailStep2Template',  data.emailStep2Template);
    assign('emailStep3DelayMin',  data.emailStep3DelayMin);
    assign('emailStep3Subject',   data.emailStep3Subject);
    assign('emailStep3Template',  data.emailStep3Template);
    assign('abTestEnabled',       data.abTestEnabled);
    assign('abVariantBSubject',   data.abVariantBSubject);
    assign('abVariantBTemplate',  data.abVariantBTemplate);

    const existing = await this.prisma.campaign.findFirst({ where: { storeId } });

    if (existing) {
      return this.prisma.campaign.update({ where: { id: existing.id }, data: fields });
    }
    return this.prisma.campaign.create({ data: { storeId, ...fields } });
  }
}
