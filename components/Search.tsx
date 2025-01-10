'use client';

import { useCallback, useState } from 'react';
import { request, gql } from 'graphql-request';
import { Input } from '@/components/ui/input';
import makeBlockie from 'ethereum-blockies-base64';
import { useGrid } from './GridProvider';

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

export function Search({ onSelectAddress }: SearchProps) {
  const { setIsSearching } = useGrid();
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
        const { search_profiles: data } = (await request(
          'https://envio.lukso-testnet.universal.tech/v1/graphql',
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
    []
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
        <img
          src={profile.profileImages[0].src}
          alt={`${profile.name || profile.id} avatar`}
          className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
          onError={(e) => {
            // Fallback to blockie if image fails to load
            e.currentTarget.src = makeBlockie(profile.id);
          }}
        />
      );
    }

    return (
      <img
        src={makeBlockie(profile.id)}
        alt={`${profile.name || profile.id} avatar`}
        className="w-10 h-10 rounded-full flex-shrink-0"
      />
    );
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setIsSearching(false)}
          className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <h2 className="text-lg font-semibold text-gray-200">
          Select New Address
        </h2>
      </div>

      <div className="w-full max-w-sm mb-4">
        <div className="relative">
          <Input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter at least 3 characters to search..."
            className="w-full bg-gray-800 text-gray-200 placeholder:text-gray-400"
            disabled={loading}
          />

          {showDropdown && results.length > 0 && (
            <div className="absolute mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-start gap-3"
                  onClick={() => handleSelectProfile(result)}
                >
                  {getProfileImage(result)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-gray-200">
                      {result.name || result.id}
                    </div>
                    {result.fullName && (
                      <div className="text-sm text-gray-400 truncate">
                        {result.fullName}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 font-mono truncate">
                      {result.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
