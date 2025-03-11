import { BadGatewayException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid'
import { title } from 'process';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductService')
  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ){}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto as DeepPartial<Product>);
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDbExceptions(error)
    }
  }

  async findAll(paginationDto: PaginationDto) {

      const { limit=10, offset=0 } = paginationDto
      return await this.productRepository.find({
        take: limit,
        skip: offset
      })  
  }

  async findOne(term: string) {
    let product: Product;
    
 /*
    const foundProduct = isUUID(term) 
      ? await this.productRepository.findOneBy({ id: term }) 
      : await this.productRepository.findOneBy({ slug: term });

    product = foundProduct as Product; // Aseguramos que product sea del tipo Product
 */

  
    const queryBuilder = this.productRepository.createQueryBuilder();

    console.log(term)

    const foundProduct =  ( isUUID(term) )
       ? await this.productRepository.findOneBy({ id: term }) 
       : await queryBuilder
       .where('title = :title or slug = :slug', {
          title: term,
          slug: term
        }).getOne();

      product = foundProduct as Product; // Aseguramos que product sea del tipo Product

    if ( !product )
      throw new NotFoundException(`Product with id ${ term } not found`)
 
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id, // aqui busca por medio de la id
      ...updateProductDto as DeepPartial<Product> // aseguramos que los valores coincidan con el tipo esperado
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
