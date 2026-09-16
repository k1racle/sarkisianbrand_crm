import { IsInt, IsString, Min, Max, MaxLength } from 'class-validator';

export class AddCartItemDto {
  @IsString() @MaxLength(80) variantId!: string;
  @IsInt() @Min(1) @Max(99) quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(1) @Max(99) quantity!: number;
}
