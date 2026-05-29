import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

const FAMILY_ID = "default-family";

export function useFamilyMembers() {
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const membersQuery = query(
      collection(db, "families", FAMILY_ID, "members"),
      orderBy("createdAt", "desc")
    );
    const relationsQuery = query(
      collection(db, "families", FAMILY_ID, "relations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeMembers = onSnapshot(
      membersQuery,
      (snapshot) => {
        setMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (firestoreError) => {
        setError(firestoreError.message);
        setLoading(false);
      }
    );

    const unsubscribeRelations = onSnapshot(
      relationsQuery,
      (snapshot) => {
        setRelations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (firestoreError) => setError(firestoreError.message)
    );

    return () => {
      unsubscribeMembers();
      unsubscribeRelations();
    };
  }, []);

  const graph = useMemo(() => buildGraph(members, relations), [members, relations]);

  return { members, relations, graph, loading, error };
}

export async function saveFamilyMember(member) {
  const memberRef = member.id
    ? doc(db, "families", FAMILY_ID, "members", member.id)
    : doc(collection(db, "families", FAMILY_ID, "members"));

  await setDoc(
    memberRef,
    {
      name: member.name.trim(),
      birth: member.birth || "",
      role: member.role?.trim() || "",
      bio: member.bio?.trim() || "",
      updatedAt: serverTimestamp(),
      createdAt: member.createdAt || serverTimestamp(),
    },
    { merge: true }
  );
}

function buildGraph(members, relations) {
  const width = 880;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.min(330, 140 + members.length * 24);
  const radiusY = Math.min(190, 100 + members.length * 12);

  const nodes = members.map((member, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(members.length, 1) - Math.PI / 2;
    return {
      ...member,
      x: members.length === 1 ? centerX : centerX + Math.cos(angle) * radiusX,
      y: members.length === 1 ? centerY : centerY + Math.sin(angle) * radiusY,
    };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = relations
    .map((relation) => ({
      ...relation,
      fromNode: byId.get(relation.from),
      toNode: byId.get(relation.to),
    }))
    .filter((edge) => edge.fromNode && edge.toNode);

  return { nodes, edges, width, height };
}
