import { get } from '../store.js';
import { head } from '../ui.js';

const item = (href, t, d) => `<li><a href="${href}"><span class="grow">${t}<small>${d}</small></span><span class="chev" aria-hidden="true">›</span></a></li>`;

export function render(root) {
  const open = get().dives.filter((d) => !d.done).length;
  root.innerHTML = `${head('Practice')}
    <h3>Numbers</h3><section class="card"><ul class="list">
      ${item('#/practice/sprint', 'Arithmetic', 'Learn a method, mixed sprint or applied problems')}
      ${item('#/practice/baserate', 'Base rates', 'Probability problems with frequency trees')}
      ${item('#/practice/estimate', 'Estimation', 'Fermi questions and 90% ranges')}
    </ul></section>
    <h3>Judgement</h3><section class="card"><ul class="list">
      ${item('#/practice/judgement', 'Judgement lab', 'Decision cases and flawed arguments')}
    </ul></section>
    <h3>Communication</h3><section class="card"><ul class="list">
      ${item('#/practice/writing', 'Writing', 'A one-paragraph brief or a 100-word summary')}
      ${item('#/practice/speaking', 'Speaking', 'A 90-second impromptu answer')}
      ${item('#/practice/dives', 'Deep Dives', open ? `${open} in progress` : 'Research a question, then write or present it')}
    </ul></section>`;
}
