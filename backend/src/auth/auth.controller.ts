import { Controller, Post, UseGuards, Req, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase-auth') // Link to the security scheme defined in main.ts
  @ApiOperation({ summary: 'Authenticate user with Firebase ID token and retrieve user/organizations' })
  @ApiResponse({ status: 200, description: 'User authenticated and created/updated in DB', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized due to invalid Firebase ID token' })
  async login(@Req() req): Promise<LoginResponseDto> {
    // Firebase ID token already validated by FirebaseAuthGuard
    // User data (from Firebase) is available in req.user
    const firebaseUser = req.user;
    const user = await this.authService.findOrCreateUser(firebaseUser);
    const organizations = await this.authService.getUserOrganizations(user.id);
    return { user, organizations };
  }
}
