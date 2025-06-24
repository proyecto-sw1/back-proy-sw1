import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
@Injectable()
export class UsersService {
  //patron de diseño repository
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  create(CreateUserDto: CreateUserDto) {
    return this.userRepository.save(CreateUserDto);
  }
  //retorna si existe o no el usuario en la bd
  findOneByEmail(email: string) {
    return this.userRepository.findOneBy({ email });
  }
  //retorna los datos del usuario menos la contraseña luego de loguearse
  findByEmailWithPassword(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', ],
    });
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', ],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Verificar si el email ya existe en otro usuario
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({ 
        where: { email: updateUserDto.email } 
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado por otro usuario');
      }
    }

    // Si se actualiza la contraseña, hashearla
    if (updateUserDto.password) {
      updateUserDto.password = await bcryptjs.hash(updateUserDto.password, 10);
    }

    // Actualizar el usuario
    await this.userRepository.update(id, updateUserDto);
    
    // Retornar usuario actualizado sin password
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'dispositivo', 'createdAt', 'updatedAt']
    });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
