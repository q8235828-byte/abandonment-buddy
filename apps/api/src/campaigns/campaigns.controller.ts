import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';

import {
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';

import { CampaignsService } from './campaigns.service';
import { SaveCampaignDto } from './dto/save-campaign.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private campaignsService: CampaignsService,
  ) {}

  @Get(':storeId')
  getCampaign(
    @Param('storeId')
    storeId: string,
  ) {
    return this.campaignsService.getCampaign(
      storeId,
    );
  }

  @Post(':storeId')
  @ApiBody({
    type: SaveCampaignDto,
  })
  saveCampaign(
    @Param('storeId')
    storeId: string,

    @Body()
    dto: SaveCampaignDto,
  ) {
    return this.campaignsService.saveCampaign(
      storeId,
      dto,
    );
  }
}
