/**
 * ApparelSizeManager Component
 * 
 * Demonstrates custom metadata key implementation for Universal Profiles.
 * Shows how any key can be attached to a Universal Profile and read by mini-apps.
 * 
 * Features:
 * - Smart navigation: Shows marketplace if user has sizes set, otherwise shows size setup
 * - Settings button in marketplace view to modify sizes
 * - Shopping button in size setup view to go to marketplace
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

// Constants for RPC endpoints
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
    description: 'Comfortable running shoes for urban environments',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 2,
    name: 'Classic Leather',
    brand: 'Heritage',
    size: '8',
    price: '220 LYX',
    description: 'Timeless leather shoes for formal occasions',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 3,
    name: 'Sport Pro',
    brand: 'AthleteX',
    size: '9',
    price: '180 LYX',
    description: 'Professional athletic shoes for sports',
    image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 4,
    name: 'Casual Walk',
    brand: 'ComfortZone',
    size: '9',
    price: '120 LYX',
    description: 'Everyday comfortable walking shoes',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 5,
    name: 'Street Style',
    brand: 'TrendSet',
    size: '10',
    price: '160 LYX',
    description: 'Trendy streetwear shoes',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 6,
    name: 'Outdoor Adventure',
    brand: 'TrailBlazer',
    size: '10',
    price: '200 LYX',
    description: 'Durable outdoor hiking shoes',
    image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 7,
    name: 'Minimalist',
    brand: 'SimpleStep',
    size: '7',
    price: '140 LYX',
    description: 'Clean and simple design for everyday wear',
    image: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 8,
    name: 'High Performance',
    brand: 'MaxForce',
    size: '11',
    price: '250 LYX',
    description: 'Top-tier athletic performance shoes',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop&crop=center'
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
    category: 'Hoodies',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 2,
    name: 'Classic T-Shirt',
    brand: 'BasicEssentials',
    size: 'M',
    price: '35 LYX',
    description: 'Essential cotton t-shirt in classic fit',
    category: 'T-Shirts',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 3,
    name: 'Varsity Jacket',
    brand: 'RetroStyle',
    size: 'XL',
    price: '150 LYX',
    description: 'Classic varsity jacket with premium materials',
    category: 'Jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 4,
    name: 'Slim Fit Jeans',
    brand: 'DenimCo',
    size: 'L',
    price: '95 LYX',
    description: 'Modern slim fit jeans with stretch comfort',
    category: 'Pants',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 5,
    name: 'Athletic Tank',
    brand: 'FitGear',
    size: 'S',
    price: '28 LYX',
    description: 'Moisture-wicking athletic tank top',
    category: 'Activewear',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 6,
    name: 'Oversized Sweater',
    brand: 'CozyKnits',
    size: 'XXL',
    price: '75 LYX',
    description: 'Comfortable oversized knit sweater',
    category: 'Sweaters',
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 7,
    name: 'Fitted Dress',
    brand: 'Elegance',
    size: 'XS',
    price: '120 LYX',
    description: 'Elegant fitted dress for special occasions',
    category: 'Dresses',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=300&fit=crop&crop=center'
  },
  {
    id: 8,
    name: 'Casual Polo',
    brand: 'SportClasic',
    size: 'M',
    price: '55 LYX',
    description: 'Classic polo shirt for casual wear',
    category: 'Polo Shirts',
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=300&fit=crop&crop=center'
  }
];

export function ApparelSizeManager() {
  const { client, walletConnected, accounts, chainId } = useUpProvider();
  const [currentView, setCurrentView] = useState<'connected-user' | 'marketplace'>('connected-user');
  const [currentApparelData, setCurrentApparelData] = useState<ApparelData>({ shoeSizes: [], apparelSizes: [] });
  const [newShoeSizes, setNewShoeSizes] = useState<string>('');
  const [selectedApparelSizes, setSelectedApparelSizes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filteredShoes, setFilteredShoes] = useState(MOCK_SHOES);
  const [filteredApparel, setFilteredApparel] = useState(MOCK_APPAREL);
  const [hasApparelSizes, setHasApparelSizes] = useState(false);

  const fetchApparelData = useCallback(async () => {
    if (!walletConnected || !accounts?.[0] || !client) return;

    setIsLoading(true);
    try {
      const rpcEndpoint = chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_TESTNET;
      const erc725 = new ERC725(APPAREL_SIZE_SCHEMA, accounts[0], rpcEndpoint);

      const result = await erc725.getData('ApparelSize');
      
      if (result.value && typeof result.value === 'string') {
        try {
          const apparelData: ApparelData = JSON.parse(result.value);
          const validData = {
            shoeSizes: Array.isArray(apparelData.shoeSizes) ? apparelData.shoeSizes : [],
            apparelSizes: Array.isArray(apparelData.apparelSizes) ? apparelData.apparelSizes : []
          };
          
          setCurrentApparelData(validData);
          setNewShoeSizes(validData.shoeSizes.join(', '));
          setSelectedApparelSizes(validData.apparelSizes);
          
          // Determine if user has apparel sizes set
          const hasData = validData.shoeSizes.length > 0 || validData.apparelSizes.length > 0;
          setHasApparelSizes(hasData);
          
          // Smart navigation: show marketplace if user has sizes, otherwise show size setup
          setCurrentView(hasData ? 'marketplace' : 'connected-user');
          
          // Filter marketplace items based on user's sizes
          if (hasData) {
            const matchingShoes = validData.shoeSizes.length > 0 
              ? MOCK_SHOES.filter(shoe => validData.shoeSizes.includes(shoe.size))
              : MOCK_SHOES;
            
            const matchingApparel = validData.apparelSizes.length > 0
              ? MOCK_APPAREL.filter(apparel => validData.apparelSizes.includes(apparel.size))
              : MOCK_APPAREL;
            
            setFilteredShoes(matchingShoes);
            setFilteredApparel(matchingApparel);
          } else {
            setFilteredShoes(MOCK_SHOES);
            setFilteredApparel(MOCK_APPAREL);
          }
        } catch (parseError) {
          console.error('Error parsing ApparelSize data:', parseError);
        }
      } else {
        // No data found - show connected user view
        setHasApparelSizes(false);
        setCurrentView('connected-user');
      }
    } catch (error) {
      console.error('Error fetching apparel data:', error);
      setHasApparelSizes(false);
      setCurrentView('connected-user');
    } finally {
      setIsLoading(false);
    }
  }, [walletConnected, accounts, client, chainId]);

  const saveApparelData = useCallback(async () => {
    if (!walletConnected || !accounts?.[0] || !client) return;

    setIsSaving(true);
    try {
      // Parse shoe sizes from input
      const shoeSizes = newShoeSizes
        .split(',')
        .map(size => size.trim())
        .filter(size => size.length > 0);

      const apparelData: ApparelData = {
        shoeSizes,
        apparelSizes: selectedApparelSizes
      };

      const rpcEndpoint = chainId === 42 ? RPC_ENDPOINT_MAINNET : RPC_ENDPOINT_MAINNET;
      const erc725 = new ERC725(APPAREL_SIZE_SCHEMA, accounts[0], rpcEndpoint);

      const encodedData = erc725.encodeData([{
        keyName: 'ApparelSize',
        value: JSON.stringify(apparelData)
      }]);

      const calldata = encodeFunctionData({
        abi: [{
          name: 'setData',
          type: 'function',
          inputs: [
            { name: 'dataKeys', type: 'bytes32[]' },
            { name: 'dataValues', type: 'bytes[]' }
          ]
        }],
        functionName: 'setData',
        args: [encodedData.keys, encodedData.values]
      });

      const tx = await client.sendTransaction({
        account: accounts[0] as `0x${string}`,
        to: accounts[0] as `0x${string}`,
        data: calldata,
        chain: client.chain,
      });

      console.log('Transaction sent:', tx);
      
      // Update state and switch to marketplace view
      setCurrentApparelData(apparelData);
      setHasApparelSizes(true);
      setCurrentView('marketplace');
      
      // Filter marketplace items
      const matchingShoes = apparelData.shoeSizes.length > 0 
        ? MOCK_SHOES.filter(shoe => apparelData.shoeSizes.includes(shoe.size))
        : MOCK_SHOES;
      
      const matchingApparel = apparelData.apparelSizes.length > 0
        ? MOCK_APPAREL.filter(apparel => apparelData.apparelSizes.includes(apparel.size))
        : MOCK_APPAREL;
      
      setFilteredShoes(matchingShoes);
      setFilteredApparel(matchingApparel);
      
    } catch (error) {
      console.error('Error saving apparel data:', error);
    } finally {
      setIsSaving(false);
    }
  }, [walletConnected, accounts, client, chainId, newShoeSizes, selectedApparelSizes]);

  useEffect(() => {
    fetchApparelData();
  }, [fetchApparelData]);

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

  const handleViewChange = (view: 'connected-user' | 'marketplace') => {
    setCurrentView(view);
  };

  if (!walletConnected) {
    return (
      <div className="w-full bg-white/90 backdrop-blur-sm rounded-xl p-4 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Apparel Size Manager</h2>
        <p className="text-sm text-gray-600">Please connect your Universal Profile to manage your apparel preferences.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        
        {/* Navigation buttons */}
        <div className="flex gap-1">
          {currentView === 'marketplace' && (
            <button
              onClick={() => handleViewChange('connected-user')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Update your size preferences"
            >
              <lukso-icon name="settings" size="small" color="neutral-60"></lukso-icon>
              Size Preferences
            </button>
          )}
          
          {currentView === 'connected-user' && hasApparelSizes && (
            <button
              onClick={() => handleViewChange('marketplace')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Browse marketplace"
            >
              <lukso-icon name="category" size="small" color="neutral-60"></lukso-icon>
              Visit Marketplace
            </button>
          )}
        </div>
      </div>

      {/* Connected User View */}
      {currentView === 'connected-user' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-semibold mb-1">Set Your Size Preferences</h3>
            <p className="text-gray-600 text-xs mb-3">
              Store sizes as metadata on your Universal Profile
            </p>
          </div>

          {/* Current Data Display */}
          {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-center space-y-1">
                <lukso-icon name="profile" size="small" color="neutral-20" class="mx-auto"></lukso-icon>
                {currentApparelData.shoeSizes.length > 0 && (
                  <div>
                    <span className="text-xs font-medium">Shoe Sizes: </span>
                    <span className="text-sm font-bold text-gray-900">{currentApparelData.shoeSizes.join(', ')}</span>
                  </div>
                )}
                {currentApparelData.apparelSizes.length > 0 && (
                  <div>
                    <span className="text-xs font-medium">Apparel Sizes: </span>
                    <span className="text-sm font-bold text-gray-900">{currentApparelData.apparelSizes.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Size Inputs */}
          <div className="space-y-4">
            {/* Shoe Sizes Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Shoe Sizes (US) - comma separated
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
            </div>

            {/* Apparel Sizes Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Apparel Sizes - Select all that apply
              </label>
              <div className="grid grid-cols-6 gap-2">
                {APPAREL_SIZES.map((size) => (
                  <label
                    key={size}
                    className={`flex items-center justify-center p-2 border-2 rounded-md cursor-pointer transition-colors text-xs ${
                      selectedApparelSizes.includes(size)
                        ? 'border-gray-500 bg-gray-50 text-gray-700'
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
              size="small"
              isLoading={isSaving}
              disabled={(!newShoeSizes.trim() && selectedApparelSizes.length === 0) || isLoading}
              is-full-width
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </lukso-button>
          </div>

          {/* Information Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
            <h4 className="font-medium text-green-800 mb-1">How it works:</h4>
            <ul className="text-green-700 space-y-0.5">
              <li>• Sizes stored on your Universal Profile</li>
              <li>• Any dApp can read this for personalization</li>
              <li>• Data is on-chain and owned by you</li>
            </ul>
          </div>
        </div>
      )}

      {/* Marketplace View */}
      {currentView === 'marketplace' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-semibold mb-1">Personal Marketplace</h3>
            <p className="text-gray-600 text-xs mb-2">
              {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0)
                ? 'Items matching your sizes' 
                : 'Set your sizes for personalized recommendations'
              }
            </p>
          </div>

          {/* Current Preferences Display */}
          {(currentApparelData.shoeSizes.length > 0 || currentApparelData.apparelSizes.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs">
              <div className="flex flex-wrap gap-3 justify-center">
                {currentApparelData.shoeSizes.length > 0 && (
                  <div>
                    <span className="font-medium">Shoes: </span>
                    <span className="text-gray-900">{currentApparelData.shoeSizes.join(', ')}</span>
                  </div>
                )}
                {currentApparelData.apparelSizes.length > 0 && (
                  <div>
                    <span className="font-medium">Apparel: </span>
                    <span className="text-gray-900">{currentApparelData.apparelSizes.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shoes Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <lukso-icon name="cube" size="small" color="neutral-60" class="mr-1"></lukso-icon>
              Shoes ({filteredShoes.length})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {filteredShoes.map((shoe) => (
                <div key={shoe.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                    <img 
                      src={shoe.image} 
                      alt={shoe.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.classList.add('hidden');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <lukso-icon name="cube" size="medium" color="neutral-60"></lukso-icon>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="font-semibold text-sm text-gray-900 truncate">{shoe.name}</h5>
                    <p className="text-xs text-gray-600">{shoe.brand}</p>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-medium">Size {shoe.size}</span>
                      <span className="font-bold text-xs text-gray-900">{shoe.price}</span>
                    </div>
                    
                    <lukso-button
                      variant="secondary"
                      size="small"
                      is-full-width
                    >
                      View
                    </lukso-button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Apparel Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <lukso-icon name="wardrobe" size="small" color="neutral-60" class="mr-1"></lukso-icon>
              Apparel ({filteredApparel.length})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {filteredApparel.map((apparel) => (
                <div key={apparel.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                    <img 
                      src={apparel.image} 
                      alt={apparel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.classList.add('hidden');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <lukso-icon name="wardrobe" size="medium" color="neutral-60"></lukso-icon>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="font-semibold text-sm text-gray-900 truncate">{apparel.name}</h5>
                    <p className="text-xs text-gray-600">{apparel.brand}</p>
                    <p className="text-xs text-gray-500">{apparel.category}</p>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-medium">Size {apparel.size}</span>
                      <span className="font-bold text-xs text-gray-900">{apparel.price}</span>
                    </div>
                    
                    <lukso-button
                      variant="secondary"
                      size="small"
                      is-full-width
                    >
                      View
                    </lukso-button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Matching Items Messages */}
          {currentApparelData.shoeSizes.length > 0 && filteredShoes.length === 0 && (
            <div className="text-center py-4">
              <lukso-icon name="search" size="medium" color="neutral-60" class="mb-2"></lukso-icon>
              <p className="text-xs text-gray-600">No shoes in your sizes</p>
            </div>
          )}

          {currentApparelData.apparelSizes.length > 0 && filteredApparel.length === 0 && (
            <div className="text-center py-4">
              <lukso-icon name="search" size="medium" color="neutral-60" class="mb-2"></lukso-icon>
              <p className="text-xs text-gray-600">No apparel in your sizes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 