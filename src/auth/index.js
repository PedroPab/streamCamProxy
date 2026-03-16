export { configurePassport } from './passport.js';
export { default as passport } from 'passport';

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair
} from './jwt.js';

export { authenticate, authenticateLocal } from './middleware/authenticate.js';
export { authorize, isAdmin, isAuthenticated } from './middleware/authorize.js';
export { optionalAuth } from './middleware/optionalAuth.js';

export {
    login,
    register,
    refreshToken,
    logout,
    getCurrentUser,
    changePassword
} from './auth.controller.js';
