
import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  @Post('test')
  test() {
    return {
      message: 'Queue module working',
    };
  }
}

