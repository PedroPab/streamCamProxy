import { StreamModel } from '../../models/stream.model.js';
import { GroupModel } from '../../models/group.model.js';
import { PermissionModel } from '../../models/permission.model.js';
import { UserModel } from '../../user/user.model.js';

const ESP32_HOST = process.env.ESP32_HOST || '192.168.1.6';
const ESP32_PORT = parseInt(process.env.ESP32_PORT || '81', 10);
const ESP32_PATH = process.env.ESP32_PATH || '/stream';

export async function seedDefaultStreamAndGroup() {
    // Crear grupo default si no existe
    let defaultGroup = GroupModel.findByName('default');
    if (!defaultGroup) {
        defaultGroup = GroupModel.create({
            name: 'default',
            description: 'Grupo por defecto para todos los usuarios'
        });
        console.log('Grupo "default" creado');
    } else {
        console.log('Grupo "default" ya existe');
    }

    // Crear stream default basado en variables de entorno
    const existingStreams = StreamModel.findAll({ includeInactive: true });
    let defaultStream = existingStreams.find(s => s.name === 'ESP32-CAM Principal');

    if (!defaultStream) {
        defaultStream = StreamModel.create({
            name: 'ESP32-CAM Principal',
            description: 'Stream principal de la cámara ESP32-CAM',
            host: ESP32_HOST,
            port: ESP32_PORT,
            path: ESP32_PATH,
            isPublic: 0,
            isActive: 1
        });
        console.log('Stream "ESP32-CAM Principal" creado');
    } else {
        console.log('Stream "ESP32-CAM Principal" ya existe');
    }

    // Asignar permisos completos al grupo default para el stream default
    const existingPermissions = PermissionModel.getForGroupAndStream(defaultGroup.id, defaultStream.id);
    if (!existingPermissions) {
        PermissionModel.assign({
            streamId: defaultStream.id,
            groupId: defaultGroup.id,
            canView: 1,
            canCapture: 1,
            canRecord: 1,
            canAdmin: 0
        });
        console.log('Permisos asignados al grupo "default" para stream principal');
    }

    // Asignar todos los usuarios existentes al grupo default
    const allUsers = UserModel.findAll();
    for (const user of allUsers) {
        if (!GroupModel.isUserInGroup(user.id, defaultGroup.id)) {
            GroupModel.addUser(defaultGroup.id, user.id);
            console.log(`Usuario "${user.username}" agregado al grupo "default"`);
        }
    }

    return { defaultStream, defaultGroup };
}

export default seedDefaultStreamAndGroup;
