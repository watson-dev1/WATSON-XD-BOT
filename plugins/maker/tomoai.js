import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tomoai',
    category: 'maker',
    description: 'AI Image: tomoai',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tomoai', ctx.prefix); }
};