import * as THREE from "three";
import { LoaderUtils } from "three";
import type { GLTFLoader, GLTFLoaderPlugin, GLTFParser } from "three-stdlib";

function assignExtrasToUserData(
  object: THREE.Texture,
  gltfDef: { extras?: unknown },
) {
  if (gltfDef.extras !== undefined && typeof gltfDef.extras === "object") {
    Object.assign(object.userData, gltfDef.extras as object);
  }
}

type GltfImageDef = {
  uri?: string;
  bufferView?: number;
  mimeType?: string;
  name?: string;
  extras?: unknown;
};

type GLTFParserWithCache = GLTFParser & {
  sourceCache: Record<number, Promise<THREE.Texture>>;
};

/**
 * GLTFParser revokes `sourceURI` after load, but for bufferView images that
 * outer variable is still the Promise — revokeObjectURL breaks embedded textures.
 */
function blobTextureFixPlugin(parser: GLTFParser): GLTFLoaderPlugin {
  const p = parser as GLTFParserWithCache;
  const original = p.loadImageSource.bind(p);

  p.loadImageSource = function (sourceIndex, imageLoader) {
    const json = p.json as { images: GltfImageDef[] };
    const sourceDef = json.images[sourceIndex];
    const options = p.options;

    if (sourceDef.bufferView === undefined) {
      return original(sourceIndex, imageLoader);
    }

    if (p.sourceCache[sourceIndex] !== undefined) {
      return p.sourceCache[sourceIndex].then((texture) => texture.clone());
    }

    const URL = self.URL || self.webkitURL;

    const promise = p
      .getDependency("bufferView", sourceDef.bufferView)
      .then((bufferView) => {
        const blob = new Blob([bufferView as BlobPart], {
          type: sourceDef.mimeType ?? "image/png",
        });
        return URL.createObjectURL(blob);
      })
      .then(
        (blobUrl) =>
          new Promise<THREE.Texture>((resolve, reject) => {
            // ImageBitmapLoader uses fetch(); blob URLs often fail there. HTMLImageElement is reliable.
            const img = new Image();
            img.decoding = "async";
            img.onload = () => {
              try {
                const texture = new THREE.Texture(img);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;
                URL.revokeObjectURL(blobUrl);
                assignExtrasToUserData(texture, sourceDef);
                texture.userData.mimeType =
                  sourceDef.mimeType ??
                  (typeof sourceDef.uri === "string"
                    ? (sourceDef.uri.match(/^data:(.*?);/)?.[1] ?? "")
                    : "");
                resolve(texture);
              } catch (e) {
                URL.revokeObjectURL(blobUrl);
                reject(e);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              reject(new Error("bufferView image decode failed"));
            };
            img.src = LoaderUtils.resolveURL(blobUrl, options.path);
          }),
      )
      .catch((error: unknown) => {
        console.error(
          "THREE.GLTFLoader: Couldn't load bufferView texture",
          error,
        );
        throw error;
      });

    p.sourceCache[sourceIndex] = promise;
    return promise;
  };

  return {
    name: "BufferViewTextureBlobRevokeFix",
  } as unknown as GLTFLoaderPlugin;
}

/** Pass as drei's `useGLTF(..., extendLoader)` 4th argument (stable reference). */
export function extendGltfLoaderBufferViewTextureFix(loader: GLTFLoader) {
  loader.register(blobTextureFixPlugin);
}
