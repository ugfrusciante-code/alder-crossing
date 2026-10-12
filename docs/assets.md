# Asset provenance

All runtime artwork is local; no third-party game assets are included. The material atlas, meadow and foliage images were generated with OpenAI's built-in image generation tool for this project. Buildings, terrain, props, characters and interface icons are constructed in code. These are development assets; generated textures are not a substitute for the blueprint's bespoke production art.

The concept sheets in `public/reference/` originate from this project's design blueprint. The world panorama is a mood/composition reference; the architectural production kit guides the modular models. The blueprint's `07-image-prompts.md` contains the concept-art specification.

## Material atlas

Output: `public/textures/material-atlas.png`. Generation: `exec-7115e1da-4b1a-4717-8d95-89ac12c327a9.png`. The architectural kit was supplied as a visual reference. Prompt:

> Use case: game-material-texture. Generate a square 2048x2048 texture atlas containing EXACTLY FOUR seamless flat material textures arranged as four equal 1024x1024 quadrants with NO margins, borders, dividers, text or shading from directional light. Top left: weathered GOLDEN BROWN THATCH roof, densely layered cut reeds with dark earthy undershadow in neat overlapping horizontal courses, fibers run vertically, warm muted straw and umber, rough and medieval. Top right: weathered cream lime plaster with fine mottling, subtle hair cracks and patches of wear, neutral warm ivory but not pure white. Bottom left: dark weathered oak planks running vertically, natural grain, rough fibers, occasional knots, narrow gaps, neutral desaturated brown. Bottom right: rough grey and warm grey fieldstone masonry with irregular flattened rounded stones and recessed dark lime mortar, rustic medieval. Each quadrant is its own flat albedo texture seen directly orthographic head-on. Detailed handpainted realism with visible material grain, sophisticated restrained colors, NOT graphic patterns, no objects, no buildings, no perspective. The materials are for real-time 3D models matching the referenced medieval architectural art. Use reference as style/material guidance only.

## Meadow

Output: `public/textures/meadow.png`. Generation: `exec-3f7fd1c3-21cc-4a67-93ac-0f5b0aa3f45f.png`. Prompt:

> Use case: game-material-texture. Create a perfectly seamless repeating albedo ground texture for a high quality medieval village strategy game. Square 2048x2048. Directly downward orthographic view at a roughly 5 metre wide patch of earthy meadow. Muted olive and sage grass tufts of different lengths amid moss, ochre dry grass, small exposed brown dirt patches, fine scattered leaf litter, tiny pebbles. Natural organic distribution, beautiful painterly realism, very subtle value variation, nuanced material detail, richly layered yet subdued. Color overall desaturated medium olive brown, not lime green, not bright. No trees, no shadows cast by offscreen objects, no buildings, no footpaths, no objects, no text, no perspective, no noticeable central focal point. Seamless all edges, diffuse soft lighting, no baked directional lighting.

## Foliage

Output: `public/textures/foliage.png`, transparent background. Generation: `exec-205445fa-9322-482d-9aad-2bd572fbf85a.png`. Prompt:

> Use case: photorealistic-natural. Asset type: alpha-cutout foliage card texture for a high fidelity medieval village 3D game. A dense irregular cloud of small alder and oak leaves on fine dark branching twigs, seen straight on. Natural deep sage green and muted olive foliage, small warm yellow-green tips, like realistic European woodland in soft afternoon sun. The foliage cluster occupies the central 85 percent of a square canvas, many varied leaves, fine detailed serrated leaf edges, lacy perforated silhouette with transparent gaps between leaves, substantial dense center. No trunk, no ground, no pot, no scene, no text. Fully transparent background and empty corners. Real material, restrained saturation, high microdetail, soft even light without strong baked shadows. This is a branch canopy cluster for repeating on intersecting cards to build dimensional trees, not a whole tree.

Prompts describe intended properties, including seamlessness and resolution; they are not independent certification of generated output. The runtime uses the generated results as textures on interactive geometry.

## Software notices

Three.js, Electron and other installed dependencies retain their package licenses. The desktop package includes Electron's license material and Chromium notices. No Manor Lords artwork, music or code was copied.
