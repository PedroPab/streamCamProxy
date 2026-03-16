import { UserModel } from '../../user/user.model.js';

export async function seedAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@streamcam.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    const existingAdmin = UserModel.findByEmail(adminEmail);

    if (!existingAdmin) {
        await UserModel.create({
            email: adminEmail,
            password: adminPassword,
            username: 'Administrator',
            role: 'admin'
        });
        console.log('Usuario admin creado:', adminEmail);
    } else {
        console.log('Usuario admin ya existe:', adminEmail);
    }
}

export default seedAdminUser;
