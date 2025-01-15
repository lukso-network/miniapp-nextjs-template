// This pre-build script is responsible to copy assets and from lukso web-components so they would
// work with the correct styles and images that are used on the components.
import { assets } from '@lukso/web-components/tools/assets';
import { copyAssets } from '@lukso/web-components/tools/copy-assets';

copyAssets('./public', assets);
