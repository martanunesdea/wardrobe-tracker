/**
 * App.jsx — Root component.
 */
import React, { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useWardrobe } from "./hooks/useWardrobe";
import { useWishlist } from "./hooks/useWishlist";
import AuthPage from "./components/AuthPage";
import WardrobeView from "./components/WardrobeView";
import WishlistView from "./components/WishlistView";

function AppInner() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("wardrobe");
  const wardrobe = useWardrobe();
  const wishlist = useWishlist();

  if (wardrobe.loading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0d1117"}}>
        <p style={{color:"#6b7280",marginTop:16}}>Loading your wardrobe…</p>
      </div>
    );
  }

  if (wardrobe.error) {
    logout();
    return null;
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d1117",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <nav style={{display:"flex",alignItems:"center",gap:20,padding:"0 24px",height:56,background:"#111827",borderBottom:"1px solid #1f2937",position:"sticky",top:0,zIndex:100}}>
        <span style={{color:"#f9fafb",fontWeight:700,fontSize:18,minWidth:120}}>👗 Wardrobe</span>
        <div style={{display:"flex",gap:4,flex:1,justifyContent:"center"}}>
          {["wardrobe","wishlist"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{padding:"6px 20px",borderRadius:8,border:"none",background:tab===t?"rgba(108,99,255,0.15)":"transparent",color:tab===t?"#a78bfa":"#6b7280",cursor:"pointer",fontSize:14,fontWeight:500}}>
              {t === "wardrobe" ? "My Wardrobe" : "Wishlist"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,minWidth:120,justifyContent:"flex-end"}}>
          <span style={{color:"#6b7280",fontSize:12}}>{user.email}</span>
          <button onClick={logout} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #374151",background:"transparent",color:"#9ca3af",cursor:"pointer",fontSize:12}}>Sign out</button>
        </div>
      </nav>
      <main style={{maxWidth:900,margin:"0 auto",padding:"24px 16px"}}>
        {tab === "wardrobe" && (
          <WardrobeView
            collections={wardrobe.collections} items={wardrobe.items}
            createCollection={wardrobe.createCollection} updateCollection={wardrobe.updateCollection}
            deleteCollection={wardrobe.deleteCollection} createItem={wardrobe.createItem}
            updateItem={wardrobe.updateItem} deleteItem={wardrobe.deleteItem}
          />
        )}
        {tab === "wishlist" && (
          <WishlistView
            wishlist={wishlist.wishlist} priorities={wishlist.priorities}
            collections={wardrobe.collections} addWish={wishlist.addWish}
            removeWish={wishlist.removeWish}
            priorityFormula={wishlist.priorityFormula}
            setPriorityFormula={wishlist.setPriorityFormula}
            promoteToWardrobe={async (id, payload) => {
              const result = await wishlist.promoteToWardrobe(id, payload);
              wardrobe.refresh();
              return result;
            }}
          />
        )}
      </main>
    </div>
  );
}

function AuthGuard() {
  const { user } = useAuth();
  return user ? <AppInner /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}
