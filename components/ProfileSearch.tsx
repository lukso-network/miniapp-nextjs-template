/**
 * ProfileSearch Component
 * 
 * A searchable interface for LUKSO Universal Profiles that allows users to search and select
 * blockchain addresses associated with profiles.
 * 
 * Features:
 * - Auto-search triggers when exactly 3 characters are entered
 * - Manual search available via Enter key
 * - Displays profile images with blockies fallback
 * - Shows profile name, full name, and address in results
 * 
 * @component
 * @param {Object} props
 * @param {(address: `0x${string}`) => void} props.onSelectAddress - Callback function triggered when a profile is selected
 */
'use client';

import { useCallback, useState } from 'react';
import { request, gql } from 'graphql-request';
import makeBlockie from 'ethereum-blockies-base64';
import { useUpProvider } from './upProvider';
import Image from 'next/image';

const ENVIO_TESTNET_URL = 'https://envio.lukso-testnet.universal.tech/v1/graphql';
const ENVIO_MAINNET_URL = 'https://envio.lukso-mainnet.universal.tech/v1/graphql';

const gqlQuery = gql`
  query MyQuery($id: String!) {
    search_profiles(args: { search: $id }) {
      name
      fullName
      id
      profileImages(
        where: { error: { _is_null: true } }
        order_by: { width: asc }
      ) {
        width
        src
        url
        verified
      }
    }
  }
`;

type Profile = {
  name?: string;
  id: string;
  fullName?: string;
  profileImages?: {
    width: number;
    src: string;
    url: string;
    verified: boolean;
  }[];
};

type SearchProps = {
  onSelectAddress: (address: `0x${string}`) => void;
};

export function ProfileSearch({ onSelectAddress }: SearchProps) {
  const { chainId, setIsSearching } = useUpProvider();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleSearch = useCallback(
    async (searchQuery: string, forceSearch: boolean = false) => {
      setQuery(searchQuery);

      if (searchQuery.length < 3) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      // Only search automatically for exactly 3 chars, or when forced (Enter pressed)
      if (searchQuery.length > 3 && !forceSearch) {
        return;
      }

      setLoading(true);
      try {
        const envioUrl = chainId === 42 ? ENVIO_MAINNET_URL : ENVIO_TESTNET_URL;
        const { search_profiles: data } = (await request(
          envioUrl,
          gqlQuery,
          { id: searchQuery }
        )) as { search_profiles: Profile[] };
        setResults(data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [chainId]
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query, true);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    try {
      // The profile.id should be an Ethereum address
      const address = profile.id as `0x${string}`;
      onSelectAddress(address);
      setShowDropdown(false);
      setQuery('');
      setIsSearching(false);
    } catch (error) {
      console.error('Invalid address:', error);
    }
  };

  const getProfileImage = (profile: Profile) => {
    if (profile.profileImages && profile.profileImages.length > 0) {
      return (
        <Image
          src={profile.profileImages[0].src}
          alt={`${profile.name || profile.id} avatar`}
          className="mt-1 w-10 h-10 rounded-full flex-shrink-0 object-cover"
          width={40}
          height={40}
          onError={(e) => {
            // Fallback to blockie if image fails to load
            e.currentTarget.src = makeBlockie(profile.id);
          }}
        />
      );
    }

    return (
      <Image
        src={makeBlockie(profile.id)}
        alt={`${profile.name || profile.id} avatar`}
        className="w-10 h-10 rounded-full flex-shrink-0"
        width={40}
        height={40}
      />
    );
  };

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearch(e.target.value);
    },
    [handleSearch]
  );

  return (
    <div className="w-full md:p-8 backdrop-blur-md rounded-2xl">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="md:text-l font-bold text-gray-900">
            Search Profile
          </h2>
          <lukso-button
            onClick={() => setIsSearching(false)}
            variant="primary"
            size="small"
            isFullWidth={true}
          >
            Back
          </lukso-button>
        </div>

        {/* Search Input Section */}
        <div className="space-y-2">
          <div className="relative">
            <lukso-input
              id="search"
              type="text"
              value={query}
              onInput={handleInput}
              onKeyDown={handleKeyPress}
              placeholder="Enter 3 characters to search..."
              is-full-width
              is-disabled={loading}
            />
          </div>

          {showDropdown && results.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-w-[300px] max-h-[180px] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full px-2 py-4 text-left hover:bg-gray-100 flex items-start gap-4 border-b border-gray-100 last:border-0 transition-colors"
                  onClick={() => handleSelectProfile(result)}
                >
                  {getProfileImage(result)}
                  <div className="flex-1 min-w-0">
                    {result.fullName && (
                      <div className="text-sm text-gray-600 truncate mt-0.5">
                        <lukso-username 
                          name={result.fullName} 
                          max-width="200" 
                          size="large" 
                          slice-by="8" 
                          address-color="" 
                          name-color="" 
                          custom-class="" 
                          prefix="@"
                        ></lukso-username>
                      </div>
                    )}
                    <lukso-username 
                      name="" 
                      address={result.id} 
                      max-width="200" 
                      size="large" 
                      slice-by="4" 
                      address-color="" 
                      name-color="" 
                      custom-class="" 
                      prefix="@">
                    </lukso-username>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
