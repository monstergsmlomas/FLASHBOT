import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard que protege rutas: el usuario debe estar logueado para acceder
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
