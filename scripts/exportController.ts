import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { db } from '@/db/index';
import { participants, games, itemClicks, gameEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

const tablesNames = ['participants', 'games', 'itemClicks', 'gameEvents'] as const;
type TableName = (typeof tablesNames)[number];

const getTableDataAsJSON = async (tableName: TableName, participantId?: number) => {
  let data;
  // @ts-ignore
  const tables: Record<TableName, any> = {
    participants,
    games,
    itemClicks,
    gameEvents,
  };
  const table = tables[tableName];

  if (participantId) {
    if (tableName === 'participants') {
      data = await db.select().from(table).where(eq(table.id, participantId));
    } else {
      data = await db.select().from(table).where(eq(table.participantId, participantId));
    }
  } else {
    data = await db.select().from(table);
  }
  return JSON.stringify(data, null, 2);
};

const createZip = async (participantId?: number) => {
  const zip = new JSZip();
  const participant = participantId ? await db.select().from(participants).where(eq(participants.id, participantId)) : null;

  for (const table of tablesNames) {
    const json = await getTableDataAsJSON(table, participantId);
    zip.file(`${table}.json`, json);
  }

  const content = await zip.generateAsync({ type: 'base64' });
  const filename = participant ? `participant_${participant[0].anonymousId}_export.zip` : 'all_data_export.zip';
  const uri = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return uri;
};

export const exportData = async (participantId?: number) => {
  try {
    const uri = await createZip(participantId);
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert(error);
  }
};
