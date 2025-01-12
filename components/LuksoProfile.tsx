import { useEffect, useState } from 'react';
import { ERC725 } from '@erc725/erc725.js';
import erc725schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
const RPC_ENDPOINT = 'https://4201.rpc.thirdweb.com';

interface LuksoProfileProps {
    address: string;
    size?: 'small' | 'medium' | 'large';
    hasIdenticon?: boolean;
}

export function LuksoProfile({ address, size, hasIdenticon = true }: LuksoProfileProps) {
    const [profileImgUrl, setProfileImgUrl] = useState<string>(
        'https://tools-web-components.pages.dev/images/sample-avatar.jpg'
    );
    
    useEffect(() => {
        async function fetchProfileImage() {
            if (!address) return;

            try {
                const config = { ipfsGateway: IPFS_GATEWAY };
                const profile = new ERC725(erc725schema, address, RPC_ENDPOINT, config);
                const fetchedData = await profile.fetchData('LSP3Profile');
                if (
                    fetchedData?.value &&
                    typeof fetchedData.value === 'object' &&
                    'LSP3Profile' in fetchedData.value
                ) {
                    const profileImagesIPFS = fetchedData.value.LSP3Profile.profileImage;
                    if (profileImagesIPFS?.[0]?.url) {
                        const imageUrl = profileImagesIPFS[0].url.replace('ipfs://', IPFS_GATEWAY);
                        setProfileImgUrl(imageUrl);
                    }
                }

            } catch (error) {
                console.error('Error fetching profile image:', error);
            }
        }

        fetchProfileImage();
    }, [address]);

    return (
        <div>
            <lukso-profile
                profile-address={address}
                profile-url={profileImgUrl}
                has-identicon={hasIdenticon}
                size={size}
                is-square={true}
            ></lukso-profile>
        </div>
    );
} 
