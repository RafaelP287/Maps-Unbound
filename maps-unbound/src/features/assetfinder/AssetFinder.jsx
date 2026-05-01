import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Heart, Music, Star, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";

const apiServer = import.meta.env.VITE_API_SERVER;
const PAGE_SIZE = 20;
const MASONRY_GAP = 24;
const ASSET_CACHE_PREFIX = "maps-unbound-asset-page-v3";
const ASSET_CACHE_TTL_MS = 30 * 60 * 1000;

const LIST_TABS = ["public", "topLiked", "liked", "favorites", "owned"];

const TABS = [
  { id: "public", label: "Discover" },
  { id: "topLiked", label: "Top Liked" },
  { id: "liked", label: "My Likes" },
  { id: "favorites", label: "My Favorites" },
  { id: "owned", label: "My Library" },
  { id: "upload", label: "Upload Asset" },
];

const emptyMessages = {
  public: "No public assets found matching your criteria.",
  topLiked: "No liked assets found matching your criteria.",
  liked: "You have not liked any matching assets yet.",
  favorites: "You have not favorited any matching assets yet.",
  owned: "No owned assets found matching your criteria.",
};

// Helper to format bytes into readable sizes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const sortByTopLiked = (assetList) => (
  [...assetList].sort((a, b) => (
    (b.likes || 0) - (a.likes || 0)
    || (b.favorites || 0) - (a.favorites || 0)
    || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  ))
);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getPreferredColumnCount = () => {
  if (window.innerWidth < 760) return 1;
  if (window.innerWidth < 1040) return 2;
  return 3;
};

const getEstimatedColumnWidth = (columnCount) => {
  if (columnCount <= 1) return 680;
  if (columnCount === 2) return 500;
  return 340;
};

const getEstimatedCardHeight = (asset, previewRatios, columnCount) => {
  const tagCount = asset.tags?.length || 0;
  const tagRows = tagCount > 0 ? Math.ceil(tagCount / 3) : 0;
  const metadataHeight = 158 + tagRows * 24;

  if (asset.category === "audio") {
    return metadataHeight + 150;
  }

  const rawRatio = previewRatios[asset._id] || 16 / 9;
  const boundedRatio = clamp(rawRatio, 0.75, 2.35);
  const columnWidth = getEstimatedColumnWidth(columnCount);
  const previewHeight = clamp(columnWidth / boundedRatio, 150, boundedRatio < 0.95 ? 360 : 300);

  return metadataHeight + previewHeight;
};

const buildMasonryColumns = (assets, previewRatios, columnCount) => {
  const columns = Array.from({ length: columnCount }, () => []);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  assets.forEach((asset) => {
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestColumnIndex].push(asset);
    columnHeights[shortestColumnIndex] += getEstimatedCardHeight(asset, previewRatios, columnCount) + MASONRY_GAP;
  });

  return columns;
};

const getAssetCacheKey = (activeTab, queryString) => (
  `${ASSET_CACHE_PREFIX}:${activeTab}:${queryString}`
);

const readCachedAssetPage = (cacheKey) => {
  try {
    const rawCache = localStorage.getItem(cacheKey);
    if (!rawCache) return null;

    const cachedPage = JSON.parse(rawCache);
    if (!cachedPage.expiresAt || cachedPage.expiresAt < Date.now()) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (cachedPage.payload?.assets?.some((asset) => typeof asset.userCanDelete !== "boolean")) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cachedPage.payload;
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const writeCachedAssetPage = (cacheKey, payload) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      payload,
      expiresAt: Date.now() + ASSET_CACHE_TTL_MS,
    }));
  } catch {
    // Storage can be full or disabled; the vault still works without caching.
  }
};

const clearAssetPageCache = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${ASSET_CACHE_PREFIX}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore cache cleanup failures.
  }
};

const getPreviewFrameStyle = (asset, previewRatios) => {
  if (asset.category === "audio") {
    return { ...styles.previewFrame, ...styles.audioPreviewFrame };
  }

  const rawRatio = previewRatios[asset._id] || 16 / 9;
  const boundedRatio = clamp(rawRatio, 0.75, 2.35);

  return {
    ...styles.previewFrame,
    aspectRatio: `${boundedRatio} / 1`,
    maxHeight: boundedRatio < 0.95 ? "360px" : "300px",
  };
};

const getActionButtonStyle = (isActive) => ({
  ...styles.assetActionButton,
  ...(isActive ? styles.activeAssetActionButton : {}),
});

const getDeleteButtonStyle = (isDanger = false) => ({
  ...styles.assetActionButton,
  ...(isDanger ? styles.deleteActionButton : {}),
});

function AssetFinder() {
  const { user, token, isLoggedIn } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState("public");
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assetActionId, setAssetActionId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnCount, setColumnCount] = useState(getPreferredColumnCount);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [previewRatios, setPreviewRatios] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ message: "", type: "", visible: false });
  
  // Lazy Loading Detail Modal State
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "image",
    isPublic: true,
    tags: "", // Comma-separated string in UI
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ message: "", type: "", visible: false }), 4000);
  }, []);

  // Fetch Assets based on Tab
  const fetchAssets = useCallback(async () => {
    if (!LIST_TABS.includes(activeTab) || !user?.username) return;

    const queryParams = new URLSearchParams({
      username: user.username,
      page: String(currentPage),
      limit: String(PAGE_SIZE),
    });

    if (searchQuery.trim()) {
      queryParams.set("search", searchQuery.trim());
    }

    const endpoints = {
      public: "/api/assets/public",
      topLiked: "/api/assets/public",
      liked: "/api/assets/liked",
      favorites: "/api/assets/favorites",
      owned: "/api/assets/my-assets",
    };

    if (activeTab === "topLiked") {
      queryParams.set("sort", "topLiked");
    }

    const queryString = queryParams.toString();
    const cacheKey = getAssetCacheKey(activeTab, queryString);
    const shouldUseAssetCache = !user?.isAdmin;
    const cachedPage = shouldUseAssetCache ? readCachedAssetPage(cacheKey) : null;

    setSelectedAsset(null);

    if (cachedPage) {
      setAssets(cachedPage.assets || []);
      setPagination(cachedPage.pagination || {
        page: currentPage,
        limit: PAGE_SIZE,
        totalItems: cachedPage.assets?.length || 0,
        totalPages: 1,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAssets([]);
    
    try {
      const fetchUrl = `${apiServer}${endpoints[activeTab]}?${queryString}`;

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error("Failed to fetch assets.");
      const data = await response.json();
      const nextAssets = Array.isArray(data) ? data : data.assets || [];
      const nextPagination = data.pagination || {
        page: currentPage,
        limit: PAGE_SIZE,
        totalItems: nextAssets.length,
        totalPages: Math.max(1, Math.ceil(nextAssets.length / PAGE_SIZE)),
      };
      setAssets(nextAssets);
      setPagination(nextPagination);
      if (shouldUseAssetCache) {
        writeCachedAssetPage(cacheKey, {
          assets: nextAssets,
          pagination: nextPagination,
        });
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, searchQuery, token, user?.isAdmin, user?.username, showToast]);

  useEffect(() => {
    if (isLoggedIn && LIST_TABS.includes(activeTab)) {
      fetchAssets();
    }
  }, [activeTab, isLoggedIn, fetchAssets]);

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

  useEffect(() => {
    const handleResize = () => setColumnCount(getPreferredColumnCount());

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSelectedAsset(null);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handlePreviewLoad = useCallback((assetId, event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;

    const nextRatio = Number((naturalWidth / naturalHeight).toFixed(3));
    setPreviewRatios((currentRatios) => (
      currentRatios[assetId] === nextRatio
        ? currentRatios
        : { ...currentRatios, [assetId]: nextRatio }
    ));
  }, []);

  // Handle Asset Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file) return showToast("Please select a file.", "error");

    setIsUploading(true);
    try {
      // 1. Get Presigned POST URL from Backend
      const presignedRes = await fetch(`${apiServer}/api/assets/upload/generate-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: uploadData.category,
          isPublic: uploadData.isPublic,
          fileSize: uploadData.file.size,
          fileName: uploadData.file.name,
          fileType: uploadData.file.type,
          username: user.username,
        }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) throw new Error(presignedData.message);

      // 2. Upload to S3
      const formData = new FormData();
      Object.entries(presignedData.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("file", uploadData.file); // MUST be last

      const s3Res = await fetch(presignedData.url, {
        method: "POST",
        body: formData,
      });

      if (!s3Res.ok) throw new Error("Failed to upload to object storage.");

      // 3. Confirm with Backend
      const tagArray = uploadData.tags.split(",").map(tag => tag.trim()).filter(t => t);
      
      const confirmRes = await fetch(`${apiServer}/api/assets/upload/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          s3Key: presignedData.s3Key,
          category: uploadData.category,
          size: uploadData.file.size,
          isPublic: uploadData.isPublic,
          title: uploadData.title,
          description: uploadData.description,
          tags: tagArray,
          username: user.username,
        }),
      });

      if (!confirmRes.ok) throw new Error("Failed to save metadata.");

      clearAssetPageCache();
      showToast("Asset successfully uploaded!", "success");
      setUploadData({ title: "", description: "", category: "image", isPublic: true, tags: "", file: null });
      setCurrentPage(1);
      setActiveTab("owned"); // Redirect to their library
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const applyUpdatedAsset = useCallback((updatedAsset) => {
    const shouldRemoveFromCurrentTab =
      (activeTab === "liked" && !updatedAsset.userLiked) ||
      (activeTab === "favorites" && !updatedAsset.userFavorited);

    setAssets((currentAssets) => {
      if (shouldRemoveFromCurrentTab) {
        return currentAssets.filter((asset) => asset._id !== updatedAsset._id);
      }

      const mergedAssets = currentAssets.map((asset) => (
        asset._id === updatedAsset._id
          ? { ...asset, ...updatedAsset, url: asset.url }
          : asset
      ));

      return activeTab === "topLiked" ? sortByTopLiked(mergedAssets) : mergedAssets;
    });

    if (shouldRemoveFromCurrentTab) {
      setPagination((currentPagination) => {
        const totalItems = Math.max(0, currentPagination.totalItems - 1);
        return {
          ...currentPagination,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / currentPagination.limit)),
        };
      });
    }

    setSelectedAsset((currentAsset) => {
      if (!currentAsset || currentAsset._id !== updatedAsset._id) return currentAsset;
      if (shouldRemoveFromCurrentTab) return null;
      return { ...currentAsset, ...updatedAsset, url: currentAsset.url };
    });
  }, [activeTab]);

  const handleToggleAssetAction = async (asset, action, event) => {
    event?.stopPropagation();

    const actionKey = `${asset._id}-${action}`;
    setAssetActionId(actionKey);

    try {
      const response = await fetch(`${apiServer}/api/assets/${asset._id}/${action}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });
      const updatedAsset = await response.json();

      if (!response.ok) {
        throw new Error(updatedAsset.message || "Failed to update asset.");
      }

      clearAssetPageCache();
      applyUpdatedAsset(updatedAsset);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAssetActionId("");
    }
  };

  const canDeleteAsset = useCallback((asset) => (
    Boolean(asset.userCanDelete || asset.owner === user?.username || user?.isAdmin)
  ), [user?.isAdmin, user?.username]);

  const handleDeleteAsset = async (asset, event) => {
    event?.stopPropagation();

    if (!canDeleteAsset(asset)) return;

    const isOwnAsset = asset.owner === user?.username;
    const confirmMessage = isOwnAsset
      ? `Delete "${asset.title}" from your asset vault?`
      : `You are about to delete "${asset.title}", an asset owned by ${asset.owner}. This asset does not belong to you. Delete it anyway?`;

    if (!window.confirm(confirmMessage)) return;

    const actionKey = `${asset._id}-delete`;
    setAssetActionId(actionKey);

    try {
      const response = await fetch(`${apiServer}/api/assets/${asset._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete asset.");
      }

      clearAssetPageCache();
      setAssets((currentAssets) => currentAssets.filter((item) => item._id !== asset._id));
      setPagination((currentPagination) => {
        const totalItems = Math.max(0, currentPagination.totalItems - 1);
        return {
          ...currentPagination,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / currentPagination.limit)),
        };
      });
      setSelectedAsset((currentAsset) => (
        currentAsset?._id === asset._id ? null : currentAsset
      ));
      showToast("Asset deleted.", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAssetActionId("");
    }
  };

  const hasMultiplePages = pagination.totalPages > 1;
  const firstAssetNumber = pagination.totalItems === 0
    ? 0
    : (pagination.page - 1) * pagination.limit + 1;
  const lastAssetNumber = Math.min(pagination.page * pagination.limit, pagination.totalItems);
  const masonryColumns = useMemo(
    () => buildMasonryColumns(assets, previewRatios, columnCount),
    [assets, columnCount, previewRatios]
  );

  if (!isLoggedIn) return <Gate>Sign in to access the asset library.</Gate>;

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Asset Vault</h1>

      {/* TABS */}
      <div style={styles.tabContainer}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={activeTab === tab.id ? styles.activeTabBtn : styles.tabBtn}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <hr style={styles.divider} />

      {/* UPLOAD VIEW */}
      {activeTab === "upload" && (
        <div style={styles.panel}>
          <h3>Add New Asset</h3>
          <form onSubmit={handleUploadSubmit} style={styles.formGroup}>
            <input 
              type="file" 
              accept="image/*, audio/*"
              onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
              style={{ padding: "0.5rem", color: "var(--text-base)" }}
            />
            <input 
              type="text" 
              placeholder="Title" 
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              required
            />
            <textarea 
              placeholder="Description" 
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              rows="3"
              required
            />
            <input 
              type="text" 
              placeholder="Tags (comma separated, e.g., fantasy, map, dark)" 
              value={uploadData.tags}
              onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <select 
                value={uploadData.category}
                onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="image">Image</option>
                <option value="audio">Audio</option>
              </select>
              <select 
                value={uploadData.isPublic}
                onChange={(e) => setUploadData({ ...uploadData, isPublic: e.target.value === "true" })}
                style={{ flex: 1 }}
              >
                <option value="true">Public</option>
                <option value="false">Private</option>
              </select>
            </div>
            <button type="submit" disabled={isUploading} style={{ marginTop: "1rem" }}>
              {isUploading ? "Uploading..." : "Save Asset"}
            </button>
          </form>
        </div>
      )}

      {/* GALLERY / LIST VIEW */}
      {LIST_TABS.includes(activeTab) && (
        <>
          <input
            type="text"
            placeholder="Search by title, creator, or tags..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ marginBottom: "1rem" }}
          />

          <div style={styles.listToolbar}>
            <span style={styles.resultCount}>
              {pagination.totalItems > 0
                ? `${firstAssetNumber}-${lastAssetNumber} of ${pagination.totalItems}`
                : "0 assets"}
            </span>
            {hasMultiplePages && (
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  title="Previous page"
                  aria-label="Previous page"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  style={styles.pageIconButton}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={styles.pageCount}>Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  type="button"
                  title="Next page"
                  aria-label="Next page"
                  onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  style={styles.pageIconButton}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <p style={styles.emptyText}>Fetching records...</p>
          ) : assets.length > 0 ? (
            <div
              style={{
                ...styles.masonryGrid,
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              }}
            >
              {masonryColumns.map((columnAssets, columnIndex) => (
                <div key={columnIndex} style={styles.masonryColumn}>
                  {columnAssets.map((asset) => (
                    <div
                      key={asset._id}
                      style={styles.card}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div style={getPreviewFrameStyle(asset, previewRatios)}>
                        {asset.category === "image" ? (
                          <img
                            src={asset.url}
                            alt={asset.title}
                            loading="lazy"
                            decoding="async"
                            onLoad={(e) => handlePreviewLoad(asset._id, e)}
                            style={styles.previewImage}
                          />
                        ) : (
                          <div style={styles.audioPreview}>
                            <Music size={28} />
                            <audio
                              controls
                              preload="metadata"
                              src={asset.url}
                              onClick={(e) => e.stopPropagation()}
                              style={styles.previewAudio}
                            />
                          </div>
                        )}
                      </div>

                      <div style={styles.cardHeader}>
                        <h3 style={{ margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {asset.title}
                        </h3>
                        <span style={styles.badge}>{asset.category}</span>
                      </div>
                      <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>By: {asset.owner}</p>

                      {asset.tags && asset.tags.length > 0 && (
                        <div style={styles.tagContainer}>
                          {asset.tags.map((tag, i) => (
                            <span key={i} style={styles.tag}>#{tag}</span>
                          ))}
                        </div>
                      )}

                      <div style={styles.assetActions}>
                        <button
                          type="button"
                          title={asset.userLiked ? "Unlike asset" : "Like asset"}
                          aria-label={asset.userLiked ? "Unlike asset" : "Like asset"}
                          onClick={(e) => handleToggleAssetAction(asset, "like", e)}
                          disabled={assetActionId === `${asset._id}-like`}
                          style={getActionButtonStyle(asset.userLiked)}
                        >
                          <Heart size={15} fill={asset.userLiked ? "currentColor" : "none"} />
                          <span>{asset.likes || 0}</span>
                        </button>
                        <button
                          type="button"
                          title={asset.userFavorited ? "Remove favorite" : "Favorite asset"}
                          aria-label={asset.userFavorited ? "Remove favorite" : "Favorite asset"}
                          onClick={(e) => handleToggleAssetAction(asset, "favorite", e)}
                          disabled={assetActionId === `${asset._id}-favorite`}
                          style={getActionButtonStyle(asset.userFavorited)}
                        >
                          <Star size={15} fill={asset.userFavorited ? "currentColor" : "none"} />
                          <span>{asset.favorites || 0}</span>
                        </button>
                        {canDeleteAsset(asset) && (
                          <button
                            type="button"
                            title={asset.owner === user?.username ? "Delete asset" : "Delete asset as admin"}
                            aria-label={asset.owner === user?.username ? "Delete asset" : "Delete asset as admin"}
                            onClick={(e) => handleDeleteAsset(asset, e)}
                            disabled={assetActionId === `${asset._id}-delete`}
                            style={getDeleteButtonStyle(true)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div style={styles.cardFooter}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                          {formatBytes(asset.size)}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--gold)" }}>
                          Views {asset.views || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyText}>{emptyMessages[activeTab]}</p>
          )}
        </>
      )}

      {/* LAZY LOAD DETAIL MODAL */}
      {selectedAsset && (
        <div style={styles.modalOverlay} onClick={() => setSelectedAsset(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAsset.title}</h2>
            <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>By {selectedAsset.owner}</p>
            
            {/* Asset is only fetched from S3 when this renders */}
            <div style={styles.mediaContainer}>
              {selectedAsset.category === "image" ? (
                <img 
                  src={selectedAsset.url} 
                  alt={selectedAsset.title} 
                  style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: "var(--radius)" }} 
                />
              ) : (
                <audio controls src={selectedAsset.url} style={{ width: "100%" }} />
              )}
            </div>

            <p style={{ marginTop: "1rem" }}>{selectedAsset.description}</p>
            
            <div style={styles.modalActions}>
              <button
                type="button"
                title={selectedAsset.userLiked ? "Unlike asset" : "Like asset"}
                aria-label={selectedAsset.userLiked ? "Unlike asset" : "Like asset"}
                onClick={(e) => handleToggleAssetAction(selectedAsset, "like", e)}
                disabled={assetActionId === `${selectedAsset._id}-like`}
                style={getActionButtonStyle(selectedAsset.userLiked)}
              >
                <Heart size={15} fill={selectedAsset.userLiked ? "currentColor" : "none"} />
                <span>{selectedAsset.likes || 0}</span>
              </button>
              <button
                type="button"
                title={selectedAsset.userFavorited ? "Remove favorite" : "Favorite asset"}
                aria-label={selectedAsset.userFavorited ? "Remove favorite" : "Favorite asset"}
                onClick={(e) => handleToggleAssetAction(selectedAsset, "favorite", e)}
                disabled={assetActionId === `${selectedAsset._id}-favorite`}
                style={getActionButtonStyle(selectedAsset.userFavorited)}
              >
                <Star size={15} fill={selectedAsset.userFavorited ? "currentColor" : "none"} />
                <span>{selectedAsset.favorites || 0}</span>
              </button>
              {canDeleteAsset(selectedAsset) && (
                <button
                  type="button"
                  title={selectedAsset.owner === user?.username ? "Delete asset" : "Delete asset as admin"}
                  aria-label={selectedAsset.owner === user?.username ? "Delete asset" : "Delete asset as admin"}
                  onClick={(e) => handleDeleteAsset(selectedAsset, e)}
                  disabled={assetActionId === `${selectedAsset._id}-delete`}
                  style={getDeleteButtonStyle(true)}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={() => setSelectedAsset(null)} style={{ background: "transparent", border: "1px solid var(--border)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div style={styles.toastWrapper}>
          <div style={{...styles.toastContent, ...(toast.type === "error" ? styles.toastError : styles.toastSuccess)}}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles mirroring the design tokens from your index.css
const styles = {
  container: { maxWidth: "1120px", margin: "0 auto", padding: "2rem", position: "relative" },
  pageTitle: { textAlign: "center", marginBottom: "2rem" },
  tabContainer: { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" },
  tabBtn: { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" },
  activeTabBtn: { background: "linear-gradient(135deg, var(--gold), var(--gold-light))", color: "var(--bg-deep)" },
  divider: { border: "none", height: "1px", backgroundColor: "var(--border)", margin: "2rem 0" },
  panel: { backgroundColor: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", maxWidth: "600px", margin: "0 auto" },
  formGroup: { display: "flex", flexDirection: "column", gap: "1rem" },
  listToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  resultCount: { color: "var(--text-faint)", fontSize: "0.9rem" },
  paginationControls: { display: "flex", alignItems: "center", gap: "0.6rem" },
  pageIconButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", padding: 0, background: "transparent", border: "1px solid var(--border)", color: "var(--gold-light)" },
  pageCount: { color: "var(--text-muted)", fontFamily: "var(--font-heading)", fontSize: "0.78rem", letterSpacing: 0 },
  masonryGrid: { display: "grid", gap: `${MASONRY_GAP}px`, alignItems: "start" },
  masonryColumn: { display: "flex", flexDirection: "column", gap: `${MASONRY_GAP}px`, minWidth: 0 },
  card: { backgroundColor: "var(--panel-bg)", border: "1px solid rgba(201, 168, 76, 0.2)", borderRadius: "var(--radius)", padding: "1rem", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 },
  previewFrame: { width: "100%", overflow: "hidden", backgroundColor: "rgba(0, 0, 0, 0.35)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" },
  previewImage: { width: "100%", height: "100%", objectFit: "contain", display: "block", backgroundColor: "var(--bg-deep)" },
  audioPreviewFrame: { aspectRatio: "16 / 7", minHeight: "130px", padding: "1rem" },
  audioPreview: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.9rem", color: "var(--gold)" },
  previewAudio: { width: "100%" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" },
  badge: { backgroundColor: "rgba(201, 168, 76, 0.15)", color: "var(--gold)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", textTransform: "uppercase" },
  tagContainer: { display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.5rem 0 1rem 0" },
  tag: { fontSize: "0.75rem", color: "var(--bg-deep)", backgroundColor: "var(--text-muted)", padding: "0.1rem 0.4rem", borderRadius: "4px" },
  assetActions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", margin: "0.75rem 0 1rem" },
  assetActionButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", minWidth: "46px", minHeight: "34px", padding: "0.35rem 0.55rem", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", letterSpacing: 0 },
  activeAssetActionButton: { background: "rgba(201, 168, 76, 0.14)", border: "1px solid var(--gold)", color: "var(--gold-light)" },
  deleteActionButton: { marginLeft: "auto", minWidth: "34px", color: "#fca5a5", border: "1px solid rgba(192, 57, 43, 0.45)" },
  cardFooter: { display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.8rem", marginTop: "auto" },
  emptyText: { color: "var(--text-faint)", textAlign: "center", fontStyle: "italic", marginTop: "2rem" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" },
  modalContent: { backgroundColor: "var(--bg-warm)", border: "1px solid var(--gold)", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" },
  mediaContainer: { backgroundColor: "var(--bg-deep)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid var(--border)" },
  modalActions: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "2rem" },
  toastWrapper: { position: "fixed", top: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 9999 },
  toastContent: { padding: "1rem 2rem", borderRadius: "var(--radius)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)", fontFamily: "var(--font-heading)", fontSize: "1rem", textAlign: "center", minWidth: "300px" },
  toastSuccess: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--success)", color: "var(--gold-light)" },
  toastError: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--danger)", color: "#fca5a5" }
};

export default AssetFinder;
