import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

/**
 * A validation pipe that checks if a username is already taken
 * This pipe extracts the username from the request body and checks if it's unique
 */
@Injectable()
export class UsernameUniquePipe implements PipeTransform {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Transform method required by PipeTransform interface
   * @param value - The value passed to the pipe (request body)
   * @returns The unchanged value if validation passes
   * @throws BadRequestException if the username is already taken
   */
  async transform(value: any): Promise<any> {
    // Skip validation if username is not provided
    if (!value.username) {
      return value;
    }

    // Check if a user with this username already exists
    const existingUser = await this.userRepository.findOne({
      where: { username: value.username },
    });

    // Throw an exception if the username is already taken
    if (existingUser) {
      throw new BadRequestException(
        'Username already taken. Please choose a different username.',
      );
    }

    // Return the value unchanged if validation passes
    return value;
  }
}
