
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';


export default async function Home() {
    console.log("E")
  let { data: data, error } = await supabase
    .from('flashcards')
    .select('*')
            
console.log(data)

  if (error) console.log('Error fetching users:', error);

  return (
    <ul>
      {data?.map((flashcard) => (
        <li key={flashcard.id}>{flashcard.term} {flashcard.definition}</li>
      ))}
    </ul>
  );
}