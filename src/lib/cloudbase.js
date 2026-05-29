import cloudbase from "@cloudbase/js-sdk";

export const cloudbaseEnvId = import.meta.env.VITE_CLOUDBASE_ENV_ID || "";
export const cloudbaseRegion = import.meta.env.VITE_CLOUDBASE_REGION || "ap-shanghai";
export const cloudbaseFamilyId = import.meta.env.VITE_CLOUDBASE_FAMILY_ID || "leiyuan-village";
export const cloudbaseSharedEmail =
  import.meta.env.VITE_CLOUDBASE_SHARED_EMAIL ||
  import.meta.env.VITE_FAMILY_SHARED_EMAIL ||
  "leiyuancun@chen.com";
export const cloudbaseBucket = import.meta.env.VITE_CLOUDBASE_STORAGE_BUCKET || "";
export const cloudbaseEnabled = Boolean(cloudbaseEnvId);

function createCloudBaseApp() {
  if (!cloudbaseEnabled) return null;

  try {
    return cloudbase.init({
      env: cloudbaseEnvId,
      region: cloudbaseRegion,
    });
  } catch (error) {
    console.error("CloudBase initialization failed", error);
    return null;
  }
}

export const cloudbaseApp = createCloudBaseApp();

function createCloudBaseAuth() {
  if (!cloudbaseApp) return null;

  try {
    return cloudbaseApp.auth({ persistence: "local" });
  } catch (error) {
    console.error("CloudBase auth initialization failed", error);
    return null;
  }
}

function createCloudBaseDb() {
  if (!cloudbaseApp) return null;

  try {
    return cloudbaseApp.database();
  } catch (error) {
    console.error("CloudBase database initialization failed", error);
    return null;
  }
}

export const cloudbaseAuth = createCloudBaseAuth();
export const cloudbaseDb = createCloudBaseDb();

export function normalizeCloudDoc(doc) {
  return {
    id: doc.id || doc._id,
    ...doc,
  };
}

export async function uploadCloudBasePhoto(file, onProgress) {
  if (!cloudbaseApp) {
    throw new Error("CloudBase is not configured.");
  }

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `families/${cloudbaseFamilyId}/photos/${Date.now()}-${safeName}`;

  if (cloudbaseApp.storage?.from) {
    const bucket = cloudbaseBucket
      ? cloudbaseApp.storage.from(cloudbaseBucket)
      : cloudbaseApp.storage.from();
    const { data, error } = await bucket.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    const publicUrlResult = await bucket.getPublicUrl(path);
    const publicUrlData = publicUrlResult?.data;

    return {
      fileID: data?.fullPath || data?.id || path,
      imagePath: path,
      downloadURL:
        publicUrlData?.publicUrl ||
        publicUrlData?.publicURL ||
        publicUrlData?.signedUrl ||
        publicUrlData ||
        "",
    };
  }

  const result = await cloudbaseApp.uploadFile({
    cloudPath: path,
    filePath: file,
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent?.total) return;
      onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
    },
  });

  const tempUrlResult = await cloudbaseApp.getTempFileURL({
    fileList: [result.fileID],
  });
  const firstFile = tempUrlResult?.fileList?.[0] || {};

  return {
    fileID: result.fileID,
    imagePath: path,
    downloadURL: firstFile.tempFileURL || firstFile.download_url || "",
  };
}
