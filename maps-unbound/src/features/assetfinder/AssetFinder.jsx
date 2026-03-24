import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";

const apiServer = import.meta.env.VITE_API_SERVER;

// Helper to format bytes into readable sizes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

function AssetFinder() {
  const { user, token, isLoggedIn } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState("public"); // 'public', 'owned', 'upload'
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    setAssets([]); // Clear current view
    setSelectedAsset(null);
    
    try {
      const endpoint = activeTab === "public" ? "/api/assets/public" : "/api/assets/my-assets";
      const response = await fetch(`${apiServer}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        username: user.username
      });
      
      if (!response.ok) throw new Error("Failed to fetch assets.");
      const data = await response.json();
      setAssets(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, token, showToast]);

  useEffect(() => {
    if (isLoggedIn && (activeTab === "public" || activeTab === "owned")) {
      fetchAssets();
    }
  }, [activeTab, isLoggedIn, fetchAssets]);

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

      showToast("Asset successfully uploaded!", "success");
      setUploadData({ title: "", description: "", category: "image", isPublic: true, tags: "", file: null });
      setActiveTab("owned"); // Redirect to their library
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Client-Side Search Filter (Matches Title, Owner, or Tags)
  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    const matchTitle = asset.title.toLowerCase().includes(query);
    const matchOwner = asset.owner.toLowerCase().includes(query);
    const matchTags = asset.tags?.some(tag => tag.toLowerCase().includes(query));
    
    return matchTitle || matchOwner || matchTags;
  });

  if (!isLoggedIn) return <Gate>Sign in to access the asset library.</Gate>;

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Asset Vault</h1>

      {/* TABS */}
      <div style={styles.tabContainer}>
        <button 
          onClick={() => setActiveTab("public")} 
          style={activeTab === "public" ? styles.activeTabBtn : styles.tabBtn}
        >
          Discover
        </button>
        <button 
          onClick={() => setActiveTab("owned")} 
          style={activeTab === "owned" ? styles.activeTabBtn : styles.tabBtn}
        >
          My Library
        </button>
        <button 
          onClick={() => setActiveTab("upload")} 
          style={activeTab === "upload" ? styles.activeTabBtn : styles.tabBtn}
        >
          Upload Asset
        </button>
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
      {(activeTab === "public" || activeTab === "owned") && (
        <>
          <input
            type="text"
            placeholder="Search by title, creator, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: "2rem" }}
          />

          {isLoading ? (
            <p style={styles.emptyText}>Fetching records...</p>
          ) : filteredAssets.length > 0 ? (
            <div style={styles.grid}>
              {filteredAssets.map((asset) => (
                <div 
                  key={asset._id} 
                  style={styles.card}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={{ margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {asset.title}
                    </h3>
                    <span style={styles.badge}>{asset.category}</span>
                  </div>
                  <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>By: {asset.owner}</p>
                  
                  {/* Tag Display */}
                  {asset.tags && asset.tags.length > 0 && (
                    <div style={styles.tagContainer}>
                      {asset.tags.map((tag, i) => (
                        <span key={i} style={styles.tag}>#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div style={styles.cardFooter}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                      {formatBytes(asset.size)}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--gold)" }}>
                      ★ {asset.favorites} | 👁 {asset.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyText}>No assets found matching your criteria.</p>
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
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
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
  container: { maxWidth: "1000px", margin: "0 auto", padding: "2rem", position: "relative" },
  pageTitle: { textAlign: "center", marginBottom: "2rem" },
  tabContainer: { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" },
  tabBtn: { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" },
  activeTabBtn: { background: "linear-gradient(135deg, var(--gold), var(--gold-light))", color: "var(--bg-deep)" },
  divider: { border: "none", height: "1px", backgroundColor: "var(--border)", margin: "2rem 0" },
  panel: { backgroundColor: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", maxWidth: "600px", margin: "0 auto" },
  formGroup: { display: "flex", flexDirection: "column", gap: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
  card: { backgroundColor: "var(--panel-bg)", border: "1px solid rgba(201, 168, 76, 0.2)", borderRadius: "var(--radius)", padding: "1.5rem", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" },
  badge: { backgroundColor: "rgba(201, 168, 76, 0.15)", color: "var(--gold)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", textTransform: "uppercase" },
  tagContainer: { display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.5rem 0 1rem 0" },
  tag: { fontSize: "0.75rem", color: "var(--bg-deep)", backgroundColor: "var(--text-muted)", padding: "0.1rem 0.4rem", borderRadius: "4px" },
  cardFooter: { display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.8rem", marginTop: "auto" },
  emptyText: { color: "var(--text-faint)", textAlign: "center", fontStyle: "italic", marginTop: "2rem" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" },
  modalContent: { backgroundColor: "var(--bg-warm)", border: "1px solid var(--gold)", borderRadius: "var(--radius-lg)", padding: "2rem", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" },
  mediaContainer: { backgroundColor: "var(--bg-deep)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid var(--border)" },
  toastWrapper: { position: "fixed", top: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 9999 },
  toastContent: { padding: "1rem 2rem", borderRadius: "var(--radius)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)", fontFamily: "var(--font-heading)", fontSize: "1rem", textAlign: "center", minWidth: "300px" },
  toastSuccess: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--success)", color: "var(--gold-light)" },
  toastError: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--danger)", color: "#fca5a5" }
};

export default AssetFinder;
