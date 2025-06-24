/**
 * ApparelSizeManager Component
 * 
 * Demonstrates custom metadata key implementation for Universal Profiles.
 * Shows how any key can be attached to a Universal Profile and read by mini-apps.
 * 
 * Features:
 * - Connected User tab: Set/update shoe sizes and apparel sizes on the connected Universal Profile
 * - Marketplace tab: Display shoes and apparel filtered by the connected user's sizes
 * 
 * @component
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ERC725 } from '@erc725/erc725.js';
import { useUpProvider } from './upProvider';
import { encodeFunctionData, keccak256, toHex } from 'viem';

// Generate the key for ApparelSize using keccak256
const APPAREL_SIZE_KEY = keccak256(toHex('ApparelSize'));

// Custom ERC725 Schema for ApparelSize
const APPAREL_SIZE_SCHEMA = [
  {
    name: 'ApparelSize',
    key: APPAREL_SIZE_KEY,
    keyType: 'Singleton',
    valueType: 'string',
    valueContent: 'String',
  },
];

// Constants for IPFS and RPC endpoints
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
const RPC_ENDPOINT_TESTNET = 'https://rpc.testnet.lukso.network';
const RPC_ENDPOINT_MAINNET = 'https://rpc.mainnet.lukso.network';

// Apparel size options
const APPAREL_SIZES = ['XXL', 'XL', 'L', 'M', 'S', 'XS'];

// Type definitions
interface ApparelData {
  shoeSizes: string[];
  apparelSizes: string[];
}

// Mock shoe data for marketplace
const MOCK_SHOES = [
  {
    id: 1,
    name: 'Urban Runner',
    brand: 'StepStyle',
    size: '8',
    price: '150 LYX',
    description: 'Comfortable running shoes for urban environments'
  },
  {
    id: 2,
    name: 'Classic Leather',
    brand: 'Heritage',
    size: '8',
    price: '220 LYX',
    description: 'Timeless leather shoes for formal occasions'
  },
  {
    id: 3,
    name: 'Sport Pro',
    brand: 'AthleteX',
    size: '9',
    price: '180 LYX',
    description: 'Professional athletic shoes for sports'
  },
  {
    id: 4,
    name: 'Casual Walk',
    brand: 'ComfortZone',
    size: '9',
    price: '120 LYX',
    description: 'Everyday comfortable walking shoes'
  },
  {
    id: 5,
    name: 'Street Style',
    brand: 'TrendSet',
    size: '10',
    price: '160 LYX',
    description: 'Trendy streetwear shoes'
  },
  {
    id: 6,
    name: 'Outdoor Adventure',
    brand: 'TrailBlazer',
    size: '10',
    price: '200 LYX',
    description: 'Durable outdoor hiking shoes'
  },
  {
    id: 7,
    name: 'Minimalist',
    brand: 'SimpleStep',
    size: '7',
    price: '140 LYX',
    description: 'Clean and simple design for everyday wear'
  },
  {
    id: 8,
    name: 'High Performance',
    brand: 'MaxForce',
    size: '11',
    price: '250 LYX',
    description: 'Top-tier athletic performance shoes'
  }
];

// Mock apparel data for marketplace
const MOCK_APPAREL = [
  {
    id: 1,
    name: 'Premium Hoodie',
    brand: 'UrbanWear',
    size: 'L',
    price: '89 LYX',
    description: 'Comfortable cotton blend hoodie with modern fit',
    category: 'Hoodies'
  },
  {
    id: 2,
    name: 'Classic T-Shirt',
    brand: 'BasicEssentials',
    size: 'M',
    price: '35 LYX',
    description: 'Essential cotton t-shirt in classic fit',
    category: 'T-Shirts'
  },
  {
    id: 3,
    name: 'Varsity Jacket',
    brand: 'RetroStyle',
    size: 'XL',
    price: '150 LYX',
    description: 'Classic varsity jacket with premium materials',
    category: 'Jackets'
  },
  {
    id: 4,
    name: 'Slim Fit Jeans',
    brand: 'DenimCo',
    size: 'L',
    price: '95 LYX',
    description: 'Modern slim fit jeans with stretch comfort',
    category: 'Pants'
  },
  {
    id: 5,
    name: 'Athletic Tank',
    brand: 'FitGear',
    size: 'S',
    price: '28 LYX',
    description: 'Moisture-wicking athletic tank top',
    category: 'Activewear'
  },
  {
    id: 6,
    name: 'Oversized Sweater',
    brand: 'CozyKnits',
    size: 'XXL',
    price: '75 LYX',
    description: 'Comfortable oversized knit sweater',
    category: 'Sweaters'
  },
  {
    id: 7,
    name: 'Fitted Dress',
    brand: 'Elegance',
    size: 'XS',
    price: '120 LYX',
    description: 'Elegant fitted dress for special occasions',
    category: 'Dresses'
  },
  {
    id: 8,
    name: 'Casual Polo',
    brand: 'SportClasic',
    size: 'M',
    price: '55 LYX',
    description: 'Classic polo shirt for casual wear',
    category: 'Polo Shirts'
  }
];

export function ApparelSizeManager() {
  const { client, walletConnected, accounts, chainId } = useUpProvider();
  const [activeTab, setActiveTab] = useState<'connected-user' | 'marketplace'>('connected-user');
  const [currentApparelData, setCurrentApparelData] = useState<ApparelData>({ shoeSizes: [], apparelSizes: [] });
  const [newShoeSizes, setNewShoeSizes] = useState<string>('');
  const [selectedApparelSizes, setSelectedApparelSizes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filteredShoes, setFilteredShoes] = useState(MOCK_SHOES);
  const [filteredApparel, setFilteredApparel] = useState(MOCK_APPAREL);

  // Filter shoes and apparel based on current sizes
  useEffect(() => {
    if (currentApparelData.shoeSizes.length > 0) {
      const filtered = MOCK_SHOES.filter(shoe => 
        currentApparelData.shoeSizes.includes(shoe.size)
      );
      setFilteredShoes(filtered.length > 0 ? filtered : MOCK_SHOES);
    } else {
      setFilteredShoes(MOCK_SHOES);
    }

    if (currentApparelData.apparelSizes.length > 0) {
      const filtered = MOCK_APPAREL.filter(apparel => 
        currentApparelData.apparelSizes.includes(apparel.size)
      );
      setFilteredApparel(filtered.length > 0 ? filtered : MOCK_APPAREL);
    } else {
      setFilteredApparel(MOCK_APPAREL);
    }
  }, [currentApparelData]);

  // Fetch current apparel data from Universal Profile
  const fetchApparelData = useCallback(async () => {
    if (!walletConnected || !accounts[0]) return;

    setIsLoading(true);
    try {
      const config = { ipfsGateway: IPFS_GATEWAY };
      const rpcEndpoint = chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
      const erc725 = new ERC725(APPAREL_SIZE_SCHEMA, accounts[0], rpcEndpoint, config);
      
      try {
        // Try to get the data using ERC725.js automatic decoding
        const data = await erc725.getData('ApparelSize');
        if (data?.value && typeof data.value === 'string') {
          try {
            const parsedData: ApparelData = JSON.parse(data.value);
            setCurrentApparelData(parsedData);
            setNewShoeSizes(parsedData.shoeSizes.join(', '));
            setSelectedApparelSizes(parsedData.apparelSizes);
          } catch {
            // Handle legacy single shoe size format
            setCurrentApparelData({ shoeSizes: [data.value], apparelSizes: [] });
            setNewShoeSizes(data.value);
            setSelectedApparelSizes([]);
          }
          return;
        }
      } catch (decodeError) {
        console.log('ERC725.js automatic decoding failed:', decodeError);
        console.log('This is likely due to existing data in an incompatible format.');
        console.log('Starting fresh with empty state. You can re-enter your preferences.');
      }
      
      // If no data found or all decoding attempts failed, reset to empty state
      console.log('No apparel data found or unable to decode, starting fresh');
      setCurrentApparelData({ shoeSizes: [], apparelSizes: [] });
      setNewShoeSizes('');
      setSelectedApparelSizes([]);
      
    } catch (error) {
      console.error('Error fetching apparel data:', error);
      // Reset to empty state on any error
      setCurrentApparelData({ shoeSizes: [], apparelSizes: [] });
      setNewShoeSizes('');
      setSelectedApparelSizes([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletConnected, accounts, chainId]);

  // Save apparel data to Universal Profile
  const saveApparelData = useCallback(async () => {
    if (!client || !walletConnected || !accounts[0]) return;

    setIsSaving(true);
    try {
      // Parse shoe sizes from comma-separated input
      const shoeSizes = newShoeSizes
        .split(',')
        .map(size => size.trim())
        .filter(size => size.length > 0);

      const apparelData: ApparelData = {
        shoeSizes,
        apparelSizes: selectedApparelSizes
      };

      const jsonData = JSON.stringify(apparelData);
      
      console.log('Saving apparel data:', jsonData);
      console.log('Schema:', APPAREL_SIZE_SCHEMA);
      
      const config = { ipfsGateway: IPFS_GATEWAY };
      const rpcEndpoint = chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
      const erc725 = new ERC725(APPAREL_SIZE_SCHEMA, accounts[0], rpcEndpoint, config);
      
      // Encode the apparel data
      const encodedData = erc725.encodeData([
        {
          keyName: 'ApparelSize',
          value: jsonData,
        }
      ]);
      
      console.log('Encoded data:', encodedData);

      // Create setData function call using viem
      const setDataCalldata = encodeFunctionData({
        abi: [
          {
            name: 'setData',
            type: 'function',
            inputs: [
              { name: 'dataKey', type: 'bytes32' },
              { name: 'dataValue', type: 'bytes' }
            ],
            outputs: [],
            stateMutability: 'nonpayable'
          }
        ],
        functionName: 'setData',
        args: [encodedData.keys[0] as `0x${string}`, encodedData.values[0] as `0x${string}`]
      });

      // Execute setData transaction via Universal Profile
      const tx = await client.sendTransaction({
        account: accounts[0] as `0x${string}`,
        to: accounts[0] as `0x${string}`,
        data: setDataCalldata,
        value: BigInt(0),
        chain: client.chain,
      });

      // Update local state
      setCurrentApparelData(apparelData);
      console.log('Apparel data saved successfully:', tx);
    } catch (error) {
      console.error('Error saving apparel data:', error);
    } finally {
      setIsSaving(false);
    }
  }, [client, walletConnected, accounts, newShoeSizes, selectedApparelSizes, chainId]);

  // Fetch apparel data on component mount and when wallet connects
  useEffect(() => {
    fetchApparelData();
  }, [fetchApparelData]);

  const handleTabChange = (tabName: 'connected-user' | 'marketplace') => {
    setActiveTab(tabName);
  };

  const handleShoeSizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewShoeSizes(e.target.value);
  };

  const handleApparelSizeToggle = (size: string) => {
    setSelectedApparelSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleSaveKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveApparelData();
    }
  };

  if (!walletConnected) {
    return (
      <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Apparel Size Manager</h2>
        <p className="text-gray-600">Please connect your Universal Profile to manage your apparel preferences.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Custom Metadata: Apparel & Shoe Sizes
      </h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => handleTabChange('connected-user')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'connected-user'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Connected User
        </button>
        <button
          onClick={() => handleTabChange('marketplace')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'marketplace'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Marketplace
        </button>
      </div>

      {/* Connected User Tab Content */}
      {activeTab === 'connected-user' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Set Your Size Preferences</h3>
            <p className="text-gray-600 text-sm mb-4">
              Store multiple shoe sizes and apparel sizes as JSON metadata on your Universal Profile
            </p>
          </div>

          {/* Current Data Display */}
          {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center space-y-2">
                <lukso-icon name="profile" size="small" color="neutral-20" class="mx-auto"></lukso-icon>
                {currentApparelData.shoeSizes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Shoe Sizes: </span>
                    <span className="text-lg font-bold text-blue-600">{currentApparelData.shoeSizes.join(', ')}</span>
                  </div>
                )}
                {currentApparelData.apparelSizes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Apparel Sizes: </span>
                    <span className="text-lg font-bold text-blue-600">{currentApparelData.apparelSizes.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Size Inputs */}
          <div className="space-y-6">
            {/* Shoe Sizes Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Shoe Sizes (US) - Separate multiple sizes with commas
              </label>
              <lukso-input
                type="text"
                value={newShoeSizes}
                onInput={handleShoeSizeInput}
                onKeyPress={handleSaveKeyPress}
                placeholder="e.g. 8, 9, 10..."
                is-full-width
                is-disabled={isLoading || isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter multiple sizes like &quot;8, 9, 10&quot; to see shoes in all your sizes
              </p>
            </div>

            {/* Apparel Sizes Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Apparel Sizes - Select all that apply
              </label>
              <div className="grid grid-cols-3 gap-3">
                {APPAREL_SIZES.map((size) => (
                  <label
                    key={size}
                    className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedApparelSizes.includes(size)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedApparelSizes.includes(size)}
                      onChange={() => handleApparelSizeToggle(size)}
                      className="sr-only"
                      disabled={isLoading || isSaving}
                    />
                    <span className="font-medium">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            <lukso-button
              onClick={saveApparelData}
              variant="primary"
              size="medium"
              isLoading={isSaving}
              disabled={(!newShoeSizes.trim() && selectedApparelSizes.length === 0) || isLoading}
              is-full-width
            >
              {isSaving ? 'Saving to Profile...' : 'Save Size Preferences'}
            </lukso-button>
          </div>

          {/* Information Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-green-800 mb-2">How it works:</h4>
            <ul className="text-green-700 space-y-1">
              <li>• Your size preferences are stored as JSON metadata on your Universal Profile</li>
              <li>• Multiple shoe sizes and apparel sizes are supported</li>
              <li>• Any dApp can read this data to provide personalized experiences</li>
              <li>• Data is stored on-chain and owned by you</li>
            </ul>
          </div>
        </div>
      )}

      {/* Marketplace Tab Content */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Personalized Marketplace</h3>
            <p className="text-gray-600 text-sm mb-4">
              {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0)
                ? 'Showing items that match your size preferences' 
                : 'Set your sizes to see personalized recommendations'
              }
            </p>
          </div>

          {/* Current Preferences Display */}
          {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex flex-wrap gap-4 justify-center">
                {currentApparelData.shoeSizes.length > 0 && (
                  <div>
                    <span className="font-medium">Shoe Sizes: </span>
                    <span className="text-blue-600">{currentApparelData.shoeSizes.join(', ')}</span>
                  </div>
                )}
                {currentApparelData.apparelSizes.length > 0 && (
                  <div>
                    <span className="font-medium">Apparel Sizes: </span>
                    <span className="text-blue-600">{currentApparelData.apparelSizes.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shoes Section */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <lukso-icon name="cube" size="small" color="neutral-60" class="mr-2"></lukso-icon>
              Shoes ({filteredShoes.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShoes.map((shoe) => (
                <div key={shoe.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <lukso-icon name="cube" size="large" color="neutral-60"></lukso-icon>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-gray-900">{shoe.name}</h5>
                    <p className="text-sm text-gray-600">{shoe.brand}</p>
                    <p className="text-xs text-gray-500">{shoe.description}</p>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Size: {shoe.size}</span>
                        {currentApparelData.shoeSizes.includes(shoe.size) && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Your size!
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-blue-600">{shoe.price}</span>
                    </div>
                    
                    <lukso-button
                      variant={currentApparelData.shoeSizes.includes(shoe.size) ? 'primary' : 'secondary'}
                      size="small"
                      is-full-width
                    >
                      {currentApparelData.shoeSizes.includes(shoe.size) ? 'Perfect Fit!' : 'View Details'}
                    </lukso-button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Apparel Section */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <lukso-icon name="wardrobe" size="small" color="neutral-60" class="mr-2"></lukso-icon>
              Apparel ({filteredApparel.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApparel.map((apparel) => (
                <div key={apparel.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <lukso-icon name="wardrobe" size="large" color="neutral-60"></lukso-icon>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-gray-900">{apparel.name}</h5>
                    <p className="text-sm text-gray-600">{apparel.brand}</p>
                    <p className="text-xs text-blue-600 font-medium">{apparel.category}</p>
                    <p className="text-xs text-gray-500">{apparel.description}</p>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Size: {apparel.size}</span>
                        {currentApparelData.apparelSizes.includes(apparel.size) && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Your size!
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-blue-600">{apparel.price}</span>
                    </div>
                    
                    <lukso-button
                      variant={currentApparelData.apparelSizes.includes(apparel.size) ? 'primary' : 'secondary'}
                      size="small"
                      is-full-width
                    >
                      {currentApparelData.apparelSizes.includes(apparel.size) ? 'Perfect Fit!' : 'View Details'}
                    </lukso-button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Matching Items Messages */}
          {currentApparelData.shoeSizes.length > 0 && filteredShoes.length === 0 && (
            <div className="text-center py-8">
              <lukso-icon name="search" size="large" color="neutral-60" class="mb-4"></lukso-icon>
              <p className="text-gray-600">No shoes found in your sizes ({currentApparelData.shoeSizes.join(', ')})</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for more options!</p>
            </div>
          )}

          {currentApparelData.apparelSizes.length > 0 && filteredApparel.length === 0 && (
            <div className="text-center py-8">
              <lukso-icon name="search" size="large" color="neutral-60" class="mb-4"></lukso-icon>
              <p className="text-gray-600">No apparel found in your sizes ({currentApparelData.apparelSizes.join(', ')})</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for more options!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 