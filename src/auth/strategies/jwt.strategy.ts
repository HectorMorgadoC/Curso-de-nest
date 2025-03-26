import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../entities/user.entity";
import { JwtPayload } from "../interface/jwt-payload.interface";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, UnauthorizedException } from "@nestjs/common";


@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        configService: ConfigService

    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }

        super({
            secretOrKey: jwtSecret,
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        
        });
    }
    async validate( payload: JwtPayload ): Promise<User> {
        const { email } = payload;
        const user = await this.userRepository.findOne({ where: { email } });
        if ( !user ) {
            throw new UnauthorizedException('Token Not valid');
        }

        if ( !user.isActive ) {
            throw new UnauthorizedException('User is not active');
        }

        return user;
    }

}
