import { BadGatewayException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
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
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
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



  /**
   * Método para actualizar un producto existente, incluyendo sus imágenes
   * @param id Identificador único del producto
   * @param updateProductDto DTO con los datos actualizados del producto
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Desestructuramos el DTO para separar las imágenes del resto de propiedades
    // images: contiene el array de URLs de imágenes (si existe)
    // toUpdate: contiene el resto de propiedades a actualizar
    const { images, ...toUpdate } = updateProductDto

    // Buscamos el producto en la base de datos incluyendo sus imágenes actuales
    const existingProduct = await this.productRepository.findOne({
      where: { id },          // Buscamos por el ID proporcionado
      relations: ['images']   // Incluimos la relación con la tabla de imágenes
    });

    // Si no encontramos el producto, lanzamos una excepción
    if (!existingProduct) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }

    // Usamos preload para crear una entidad con los nuevos datos
    // pero manteniendo las relaciones existentes
    const product = await this.productRepository.preload({
      id,                                    // ID del producto a actualizar
      ...toUpdate as DeepPartial<Product>,   // Nuevas propiedades del producto
      images: existingProduct.images         // Mantenemos las imágenes existentes
    });

    // Verificación adicional después de preload
    if (!product) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }

    // Creamos un queryRunner para manejar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    // Conectamos el queryRunner a la base de datos
    await queryRunner.connect();
    // Iniciamos la transacción
    await queryRunner.startTransaction();

    try {
      // Si se proporcionaron nuevas imágenes en el DTO
      if (images) {
        // Eliminamos todas las imágenes actuales del producto
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        // Creamos nuevas entidades de imagen y las asignamos al producto
        product.images = images.map(image => 
          this.productImageRepository.create({ url: image })
        );
      }

      // Guardamos el producto actualizado en la base de datos
      await queryRunner.manager.save(product);
      // Confirmamos la transacción
      await queryRunner.commitTransaction();
      // Liberamos el queryRunner
      await queryRunner.release();

      // Retornamos el producto actualizado en formato plano
      return this.findOnePlain(id);
    } catch (error) {
      // Si ocurre algún error, revertimos la transacción
      await queryRunner.rollbackTransaction();
      // Liberamos el queryRunner
      await queryRunner.release();
      // Manejamos la excepción de base de datos
      this.handleDbExceptions(error);
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

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product')
    
    try {
      return await query.delete().where({}).execute()  
    } catch (error) {
      this.handleDbExceptions(error)
    }

    
  }

}
