interface LuksoUsernameProps {
    name?: string;
    size?: 'small' | 'medium' | 'large';
}

export function LuksoUsername({ name, size }: LuksoUsernameProps) {
    return (
        <div className="flex items-center justify-center">
            <lukso-username
                name={name || ''}
                size={size}
                max-width="200px"
                prefix="@"
            ></lukso-username>
        </div>
    );
} 
