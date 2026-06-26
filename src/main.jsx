        <button className="primary-button" type="submit"><Save size={17} /> Save Weekly Review</button>
      </form>
      <div className="card">
        <div className="mini-header"><Clock3 size={18} /><h3>Past Reviews</h3></div>
        {reviews.length ? (
          <div className="thought-list">
            {reviews.map((item) => (
              <article className="review-card" key={item.id}>
                <p className="eyebrow">{formatDate(item.createdAt)}</p>
                <h3>Next Week's 3</h3><p>{item.nextWeek || 'No priorities written.'}</p>
                <details><summary>Open full review</summary>
                  <p><strong>Improved:</strong> {item.improved}</p>
                  <p><strong>Avoided:</strong> {item.avoided}</p>
                  <p><strong>Mattered:</strong> {item.mattered}</p>
                  <p><strong>Stress:</strong> {item.stress}</p>
                </details>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No reviews yet" text="Save your first weekly reset to start building clarity over time." />}
      </div>
    </div>
  );
}
 
createRoot(document.getElementById('root')).render(<App />);
 
