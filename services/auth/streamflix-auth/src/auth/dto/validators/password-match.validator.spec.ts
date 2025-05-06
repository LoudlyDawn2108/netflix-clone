import {
  IsPasswordMatchConstraint,
  IsPasswordMatch,
} from './password-match.validator';
import { validate } from 'class-validator';

// Test class implementing the validator
class TestClass {
  password: string;

  @IsPasswordMatch('password')
  passwordConfirm: string;
}

describe('IsPasswordMatch Validator', () => {
  describe('IsPasswordMatchConstraint', () => {
    let validator: IsPasswordMatchConstraint;

    beforeEach(() => {
      validator = new IsPasswordMatchConstraint();
    });

    it('should return true when values match', () => {
      const args = {
        constraints: ['password'],
        object: { password: 'password123', passwordConfirm: 'password123' },
        property: 'passwordConfirm',
        value: 'password123',
        targetName: 'TestClass',
      };

      expect(validator.validate('password123', args as any)).toBe(true);
    });

    it("should return false when values don't match", () => {
      const args = {
        constraints: ['password'],
        object: { password: 'password123', passwordConfirm: 'different' },
        property: 'passwordConfirm',
        value: 'different',
        targetName: 'TestClass',
      };

      expect(validator.validate('different', args as any)).toBe(false);
    });

    it('should return custom error message', () => {
      const args = {
        constraints: ['password'],
        property: 'passwordConfirm',
        targetName: 'TestClass',
      };

      expect(validator.defaultMessage(args as any)).toBe(
        'passwordConfirm and password do not match',
      );
    });
  });

  describe('IsPasswordMatch decorator integration', () => {
    it('should validate matching passwords', async () => {
      // Arrange
      const test = new TestClass();
      test.password = 'password123';
      test.passwordConfirm = 'password123';

      // Act
      const errors = await validate(test);

      // Assert
      expect(errors.length).toBe(0);
    });

    it("should fail validation when passwords don't match", async () => {
      // Arrange
      const test = new TestClass();
      test.password = 'password123';
      test.passwordConfirm = 'different';

      // Act
      const errors = await validate(test);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isPasswordMatch');
    });
  });
});
