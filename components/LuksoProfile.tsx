/**
 * LuksoProfile Component - Renders a profile card for a LUKSO Universal Profile from the web-components library using ERC725js library
 * 
 * This component fetches and displays profile information from a LUKSO Universal Profile,
 * including the profile image, background image, and full name. It uses the ERC725js library
 * to fetch profile metadata from the blockchain.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.address - The LUKSO Universal Profile address to fetch data from
 * 
 * @remarks
 * - Uses the LUKSO testnet RPC endpoint
 * - Falls back to a default avatar if no profile image is found
 * - Handles loading states and error cases gracefully
 */

import { useEffect, useState } from 'react';
import { ERC725 } from '@erc725/erc725.js';
import erc725schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// Constants for the IPFS gateway and RPC endpoint for the LUKSO testnet
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
const RPC_ENDPOINT = 'https://rpc.testnet.lukso.network';

interface LuksoProfileProps {
    address: string;
}

export function LuksoProfile({ address }: LuksoProfileProps) {
    const [profileData, setProfileData] = useState<{
        imgUrl: string;
        fullName: string;
        background: string;
        profileAddress: string;
        isLoading: boolean;
    }>({
        imgUrl: 'https://tools-web-components.pages.dev/images/sample-avatar.jpg',
        fullName: 'username',
        background: 'https://tools-web-components.pages.dev/images/sample-background.jpg',
        profileAddress: '0x12345',
        isLoading: false,
    });

    useEffect(() => {
        async function fetchProfileImage() {
            if (!address) return;

            setProfileData(prev => ({ ...prev, isLoading: true }));

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
                    const fullName = fetchedData.value.LSP3Profile.name;
                    const profileBackground = fetchedData.value.LSP3Profile.backgroundImage;

                    setProfileData({
                        fullName: fullName || '',
                        imgUrl: profileImagesIPFS?.[0]?.url
                            ? profileImagesIPFS[0].url.replace('ipfs://', IPFS_GATEWAY)
                            : 'https://tools-web-components.pages.dev/images/sample-avatar.jpg',
                        background: profileBackground?.[0]?.url
                            ? profileBackground[0].url.replace('ipfs://', IPFS_GATEWAY)
                            : '',
                        profileAddress: address,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching profile image:', error);
                setProfileData(prev => ({
                    ...prev,
                    isLoading: false,
                }));
            }
        }

        fetchProfileImage();
    }, [address]);

    return (
        <lukso-card
            variant="profile"
            background-url={profileData.background}
            profile-url={profileData.imgUrl}
            shadow="small"
            border-radius="small"
            width={280}
            height={200}
        >
            <div slot="content" className="flex flex-col items-center">
                {!profileData.isLoading && (
                    <lukso-username
                        name={profileData.fullName}
                        address={profileData.profileAddress}
                        size="large"
                        max-width="200"
                        prefix="@"
                        class="mb-4"
                    ></lukso-username>
                )}
            </div>
        </lukso-card>
    );
} 
