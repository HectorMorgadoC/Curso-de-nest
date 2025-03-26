import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { diskStorage } from 'multer';
import { fileName } from './helpers/fileName.helper';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService
  ) {}

  @Get('product/:imageName')
  findProductImage(
    @Res() res: Response,    
    @Param('imageName') imageName: string
  ) {
    
    const path = this.filesService.getStaticProductImage(imageName);

    res.sendFile(path);
  }


  @Post('product')
  @UseInterceptors(FileInterceptor('image',{
    fileFilter: fileFilter,
    storage: diskStorage({
      destination: './static/products',
      filename: fileName
    })
  }))
  uploadProductImage(@UploadedFile() file: Express.Multer.File){

    console.log({ fileInController: file});

    if (!file) {
      throw new BadRequestException('Make sure that the file is sent correctly');
    }

    const secureUrl = `${ this.configService.get('HOST_API') }/files/products/${ file.filename }`
    return {
      secureUrl
    }
  }
}
