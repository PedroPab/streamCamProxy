export function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'No autenticado',
                message: 'Debes iniciar sesion para acceder a este recurso'
            });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                message: `Se requiere rol: ${allowedRoles.join(' o ')}. Tu rol: ${userRole}`
            });
        }

        next();
    };
}

export const isAdmin = authorize('admin');

export const isAuthenticated = authorize('admin', 'user');

export default { authorize, isAdmin, isAuthenticated };
