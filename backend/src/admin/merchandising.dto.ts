import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
export class CatalogRevisionDto { @IsInt() @Min(0) revision!:number; }
export class CategoryEditDto extends CatalogRevisionDto {
  @IsString() @MinLength(1) @MaxLength(120) @Matches(/\S/) nameRu!:string;
  @IsString() @MaxLength(100) @Matches(/^[a-zа-яё0-9]+(?:-[a-zа-яё0-9]+)*$/i) slug!:string;
  @IsString() @MaxLength(80) parentId!:string;
  @IsString() @MaxLength(10000) description!:string;
  @IsString() @MaxLength(500) imageUrl!:string;
  @IsBoolean() isActive!:boolean;
}
export class CategoryLayoutNodeDto {
  @IsString() @MaxLength(80) id!:string;
  @IsString() @MaxLength(80) parentId!:string;
}
export class CategoryLayoutDto extends CatalogRevisionDto {
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({each:true}) @Type(()=>CategoryLayoutNodeDto) nodes!:CategoryLayoutNodeDto[];
}
export class ProductBadgeDto {
  @IsString() @Matches(/^[a-z][a-z0-9-]{0,39}$/) id!:string;
  @IsString() @MinLength(1) @MaxLength(40) @Matches(/\S/) label!:string;
  @IsString() @Matches(/^#[0-9a-f]{6}$/i) color!:string;
  @IsString() @Matches(/^#[0-9a-f]{6}$/i) textColor!:string;
  @IsBoolean() isActive!:boolean;
  @IsIn(['manual','new','sale']) rule!:'manual'|'new'|'sale';
  @IsInt() @Min(1) @Max(365) newDays!:number;
}
export class ProductBadgesDto extends CatalogRevisionDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({each:true}) @Type(()=>ProductBadgeDto) badges!:ProductBadgeDto[];
}
