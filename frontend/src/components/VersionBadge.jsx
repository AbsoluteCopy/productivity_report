import { APP_VERSION } from '../version';

const VersionBadge = () => (
    <div
        style={{
            position: 'fixed',
            left: '8px',
            bottom: '6px',
            fontSize: '0.72rem',
            color: '#9ca3af',
            zIndex: 1050,
            pointerEvents: 'none',
            userSelect: 'none',
        }}
    >
        {APP_VERSION}
    </div>
);

export default VersionBadge;
