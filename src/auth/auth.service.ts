import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interface/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password ,...userDate } = createUserDto;
      const user = this.userRepository.create( {
        ...userDate,
        password: bcrypt.hashSync( password, 10 )
      } );
      await  this.userRepository.save( user );
      return {
        username: user.fullName,
        email: user.email,
        token: this.getJwtToken( { email: user.email } )
      }
    } catch ( error ) {
      this.handleDBException( error )
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true }
    })

    if (!user) {
      throw new UnauthorizedException('Credentials are not valid (email)')
    }

    if ( !bcrypt.compareSync( password, user.password )) {
      throw new UnauthorizedException('Credentials are not valid (password)')
    }

    return {
      username: user.fullName,
      email: user.email,
      token: this.getJwtToken( { email: user.email } )
    }
  }

  private getJwtToken( payload: JwtPayload ) {
    const token = this.jwtService.sign( payload );
    return token
  }

  private handleDBException( error: any ): never {
    
    if ( error.code === '23505' )
      throw new BadRequestException( error.detail );

    console.log(error)

    throw new InternalServerErrorException('Please check server logs')

  }

}
