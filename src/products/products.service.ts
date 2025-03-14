import { BadGatewayException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid'
import { title } from 'process';
import { ProductImage } from './entities/product-image.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductService')
  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>
  ){}

  async create(createProductDto: CreateProductDto) {
    try {

      const { images = [], ...productDetail} = createProductDto

      const product = this.productRepository.create({
        ...productDetail,
        description: String(productDetail.description),
        images: images.map(image => this.productImageRepository.create({ url: image }))

      });
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDbExceptions(error)
    }
  }

  async findAll(paginationDto: PaginationDto) {

      const { limit=10, offset=0 } = paginationDto
      const product =  await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true
        }
      })  

      return product.map( product => ({
        ...product,
        images: product.images?.map( img => img.url )
      }))
  }

  async findOne(term: string) {
    let product: Product;
    
    const queryBuilder = this.productRepository.createQueryBuilder('prod');

    console.log(term)

    const foundProduct =  ( isUUID(term) )
        ? await this.productRepository.findOneBy({ id: term }) 
        : await queryBuilder
        .where('title = :title or slug = :slug', {
          title: term,
          slug: term,
        })
        .leftJoinAndSelect('prod.images','prodImages')
        .getOne();

      product = foundProduct as Product; // Aseguramos que product sea del tipo Product

    if ( !product )
      throw new NotFoundException(`Product with id ${ term } not found`)

    return product;
  }

  async findOnePlain( term: string ) {
    const { images = [], ...rest } = await this.findOne( term )
    return {
      ...rest,
      images: images.map( images => images.url )
    }
  }



  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id, // aqui busca por medio de la id
      ...updateProductDto as DeepPartial<Product>,
      images:[]// aseguramos que los valores coincidan con el tipo esperado
    });

    if ( !product ) throw new NotFoundException(`Product with id: ${ id } not found`)
  
    try {
      await this.productRepository.save( product )
      return product
    } catch (error) {
      this.handleDbExceptions(error)
    }

    }

  async remove(id: string) {
    const product = await this.findOne(id)

    await this.productRepository.remove( product )

  }

  private handleDbExceptions( error: any ) {
    if ( error.code === '23505' )
      throw new BadGatewayException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')
  }

}
