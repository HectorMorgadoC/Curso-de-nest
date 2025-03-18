import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from './data/seed';


@Injectable()
export class SeedService {
  constructor(private readonly productsService: ProductsService) {}
  async runSeed() {

    return await this.insertNewProducts();
  }

  private async insertNewProducts() {
    try {
      // Eliminamos productos existentes
      await this.productsService.deleteAllProducts();

      const seedProducts = initialData.products;
      
      // Creamos los productos uno por uno
      for (const product of seedProducts) {
        await this.productsService.create({
          ...product,
          price: +product.price,
          stock: +product.stock,
          description: product.description
        });
      }

      return 'SEED ejecutado correctamente';
    } catch (error) {
      console.error(error);
      throw new Error('Error en la inserción de productos semilla');
    }
  }
}
