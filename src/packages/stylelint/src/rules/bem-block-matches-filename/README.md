# `habsum/bem-block-matches-filename`

Ensures the top-level BEM block in each stylesheet matches its filename.

For `_card.scss`, the first class on each top-level rule must be `.card`, `.card__…`, or `.card--…`. A top-level `.button` selector in that file is reported.
