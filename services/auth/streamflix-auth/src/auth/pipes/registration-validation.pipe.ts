import {
  Injectable,
  PipeTransform,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { User } from '../../database/entities/user.entity';
import { RegisterUserDto } from '../dto/register-user.dto';
import { EmailUniquePipe } from './email-unique.pipe';

/**
 * Comprehensive validation pipe for user registration
 * Performs the following validations:
 * 1. DTO validation with class-validator
 * 2. Email uniqueness check (case-insensitive)
 * 3. Username uniqueness check
 * 4. Password and passwordConfirm match check
 * 5. Additional business logic validations
 */
@Injectable()
export class RegistrationValidationPipe implements PipeTransform {
  private readonly logger = new Logger(RegistrationValidationPipe.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailUniquePipe: EmailUniquePipe,
  ) {}

  /**
   * Transform and validate registration data
   * @param value - Raw registration data from request body
   * @returns Validated and transformed RegisterUserDto
   * @throws BadRequestException if validation fails
   */
  async transform(value: any): Promise<RegisterUserDto> {
    this.logger.debug('Starting registration validation process');

    try {
      // Transform plain object to DTO instance
      const userDto = plainToClass(RegisterUserDto, value);

      // Validate DTO using class-validator
      const errors = await validate(userDto);
      if (errors.length > 0) {
        // Extract validation error messages
        const errorMessages = errors
          .map((error) => {
            const constraints = error.constraints || {};
            return Object.values(constraints);
          })
          .flat();

        this.logger.debug(`Validation errors: ${errorMessages.join(', ')}`);
        throw new BadRequestException(errorMessages);
      }

      // Email uniqueness check - use the enhanced EmailUniquePipe
      if (userDto.email) {
        try {
          // This will normalize the email and perform all validations
          await this.emailUniquePipe.transform({ email: userDto.email });
          // If transform succeeds, update the DTO with normalized email
          userDto.email = userDto.email.toLowerCase().trim();
        } catch (error) {
          throw error; // Re-throw the error from EmailUniquePipe
        }
      }

      // Username uniqueness check - now case-insensitive as well
      if (userDto.username) {
        const usernameExists = await this.userRepository.findOne({
          where: { username: ILike(userDto.username) },
        });

        if (usernameExists) {
          this.logger.debug(`Username already taken: ${userDto.username}`);
          throw new BadRequestException(
            'Username already taken. Please choose a different username.',
          );
        }
      }

      // Password matching check (even though we have a custom validator, double check here)
      if (userDto.password !== userDto.passwordConfirm) {
        this.logger.debug('Password confirmation mismatch');
        throw new BadRequestException(
          'Password and confirmation do not match.',
        );
      }

      // Log successful validation
      this.logger.debug(
        `Registration validation successful for email: ${userDto.email}`,
      );
      return userDto;
    } catch (error) {
      // Log the error before re-throwing
      if (!(error instanceof BadRequestException)) {
        this.logger.error(
          `Unexpected validation error: ${error.message}`,
          error.stack,
        );
        throw new BadRequestException(
          'Registration validation failed. Please try again later.',
        );
      }
      throw error;
    }
  }
}
