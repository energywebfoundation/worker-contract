import { Body, Controller, Post } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() loginDTO: LoginDTO) {
    return {
      token: 'fakeToken',
    };
  }

}
