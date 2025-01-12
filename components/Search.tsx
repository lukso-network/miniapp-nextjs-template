'use client';

import { useCallback, useState } from 'react';
import { request, gql } from 'graphql-request';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  onSelectUsername: (username: string) => void;
};

export function Search({ onSelectAddress, onSelectUsername }: SearchProps) {
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
      onSelectUsername(profile.fullName || '');
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
    <div className="w-full max-w-xl mx-auto p-6 md:p-8 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Search Profile
          </h2>
          <Button
            onClick={() => setIsSearching(false)}
            variant="default"
            size="lg"
            className="font-medium"
          >
            Back
          </Button>
        </div>

        {/* Search Input Section */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              id="search"
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter at least 3 characters to search..."
              className="block w-full px-4 py-3 text-lg rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loading}
            />
          </div>

          {showDropdown && results.length > 0 && (
            <div className="mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-start gap-4 border-b border-gray-100 last:border-0 transition-colors"
                  onClick={() => handleSelectProfile(result)}
                >
                  {getProfileImage(result)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base text-gray-900 truncate">
                      {result.name || result.id}
                    </div>
                    {result.fullName && (
                      <div className="text-sm text-gray-600 truncate mt-0.5">
                        {result.fullName}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 font-mono truncate mt-1">
                      {result.id}
                    </div>
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
